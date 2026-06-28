-- Supabase Database Schema for SahiSeat Role-Based Authentication & Chat System

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    name text,
    email text,
    avatar_url text,
    phone text,
    college text,
    target_college text,
    branch text,
    year text default 'Pre-college',
    role text default 'student' check (role in ('student', 'senior', 'admin')),
    verification_status text default 'unverified' check (verification_status in ('unverified', 'pending_otp', 'pending_approval', 'approved')),
    official_email text,
    linkedin_url text,
    availability text default 'Available',
    is_verified boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) for profiles
alter table public.profiles enable row level security;

-- 2. COLLEGE VERIFICATIONS TABLE (For College Email OTP)
create table if not exists public.college_verifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    official_email text not null,
    otp text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    expires_at timestamp with time zone not null
);

alter table public.college_verifications enable row level security;

-- 3. PAYMENTS TABLE
create table if not exists public.payments (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    razorpay_order_id text not null,
    razorpay_payment_id text not null,
    amount numeric(10, 2) not null,
    service text not null,
    status text not null,
    currency text default 'INR' not null,
    verified_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.payments enable row level security;

-- 4. GUIDANCE REQUESTS TABLE
create table if not exists public.guidance_requests (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.profiles(id) on delete cascade not null,
    mentor_id uuid references public.profiles(id) on delete set null,
    payment_id uuid references public.payments(id) on delete set null,
    service_type text check (service_type in ('chat', 'voice', 'preference', 'roadmap')) not null,
    remarks text,
    college text,
    branch text,
    status text default 'pending' check (status in ('pending', 'assigned', 'accepted', 'completed', 'cancelled')) not null,
    admin_notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.guidance_requests enable row level security;

-- 5. CONVERSATIONS TABLE
create table if not exists public.conversations (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.profiles(id) on delete cascade not null,
    senior_id uuid references public.profiles(id) on delete cascade not null,
    request_id uuid references public.guidance_requests(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(student_id, senior_id, request_id)
);

alter table public.conversations enable row level security;

-- 6. MESSAGES TABLE
create table if not exists public.messages (
    id uuid default gen_random_uuid() primary key,
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    sender_id uuid references public.profiles(id) on delete cascade not null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;

-- 7. SAVED PREFERENCES TABLE
create table if not exists public.saved_preferences (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    preferences jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(student_id)
);

alter table public.saved_preferences enable row level security;

-- 8. ROADMAPS TABLE
create table if not exists public.roadmaps (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    content text not null,
    created_by uuid references public.profiles(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.roadmaps enable row level security;

-- 9. PREFERENCE REVIEWS TABLE
create table if not exists public.preference_reviews (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.profiles(id) on delete cascade not null,
    senior_id uuid references public.profiles(id) on delete set null,
    original_list jsonb not null,
    feedback text,
    status text default 'pending' check (status in ('pending', 'reviewed')) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.preference_reviews enable row level security;


-- ─────────────────────────────────────────────────────────────────────────────
-- DATABASE TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- A. Auto Profile Creation on auth.users Sign Up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, avatar_url, role, verification_status, is_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'student',
    'unverified',
    false
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- B. Prevent unauthorized Role / Status updates by user
create or replace function public.check_profile_update()
returns trigger as $$
begin
  -- Keep is_verified in sync
  if new.verification_status = 'approved' then
    new.is_verified := true;
  else
    new.is_verified := false;
  end if;

  -- Only allow role or verification_status changes if user is admin, service_role, or superuser (security definer)
  if (new.role is distinct from old.role or new.verification_status is distinct from old.verification_status) then
    -- Check if current authenticated user is admin or query is executed via service_role / superuser definer
    if not (
      (current_user = 'postgres' or current_user = 'supabase_admin')
      or (auth.jwt() ->> 'role' = 'service_role')
      or exists (
        select 1 from public.profiles 
        where id = auth.uid() and role = 'admin'
      )
    ) then
      -- If they are not admin or service role or postgres, discard any role or status changes (keep old values)
      new.role := old.role;
      new.verification_status := old.verification_status;
      new.is_verified := old.is_verified;
    end if;
  end if;
  
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists before_profile_update on public.profiles;
create trigger before_profile_update
  before update on public.profiles
  for each row execute function public.check_profile_update();


-- C. SECURITY DEFINER Function to verify college OTP and update status safely
create or replace function public.verify_college_otp(p_email text, p_otp text)
returns boolean as $$
declare
    v_valid boolean;
begin
    -- Check if matching OTP exists and is not expired
    select exists (
        select 1 from public.college_verifications
        where user_id = auth.uid()
          and official_email = p_email
          and otp = p_otp
          and expires_at > now()
     ) into v_valid;

    if v_valid then
        -- Update the user's profile status to pending_approval and set official email
        update public.profiles
        set verification_status = 'pending_approval',
            official_email = p_email
        where id = auth.uid();

        -- Delete the verified OTP
        delete from public.college_verifications
        where user_id = auth.uid();
    end if;

    return v_valid;
end;
$$ language plpgsql security definer;



-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper check functions for readability:
-- Is Admin check:
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
  select exists (select 1 from public.profiles where id = user_id and role = 'admin');
$$ language sql security definer;


-- 1. PROFILES POLICIES
create policy "View profiles: own, admin, or shared chats" on public.profiles
    for select using (
        auth.uid() = id
        or public.is_admin(auth.uid())
        or exists (
            select 1 from public.conversations 
            where (student_id = auth.uid() and senior_id = public.profiles.id)
               or (senior_id = auth.uid() and student_id = public.profiles.id)
        )
    );

create policy "Update profile: own only" on public.profiles
    for update using (auth.uid() = id or public.is_admin(auth.uid()));


-- 2. COLLEGE VERIFICATIONS POLICIES
create policy "Verifications: own and admin" on public.college_verifications
    for all using (user_id = auth.uid() or public.is_admin(auth.uid()));


-- 3. PAYMENTS POLICIES
create policy "Payments: view own and admin" on public.payments
    for select using (user_id = auth.uid() or public.is_admin(auth.uid()));


-- 4. GUIDANCE REQUESTS POLICIES
create policy "Guidance requests select: own, assigned mentor, or admin" on public.guidance_requests
    for select using (
        student_id = auth.uid()
        or mentor_id = auth.uid()
        or public.is_admin(auth.uid())
    );

create policy "Guidance requests insert: own only" on public.guidance_requests
    for insert with check (student_id = auth.uid());

create policy "Guidance requests update: own, mentor, or admin" on public.guidance_requests
    for update using (
        student_id = auth.uid()
        or mentor_id = auth.uid()
        or public.is_admin(auth.uid())
    );

create policy "Guidance requests delete: admin only" on public.guidance_requests
    for delete using (public.is_admin(auth.uid()));


-- 5. CONVERSATIONS POLICIES
create policy "Conversations select: member or admin" on public.conversations
    for select using (
        student_id = auth.uid()
        or senior_id = auth.uid()
        or public.is_admin(auth.uid())
    );

create policy "Conversations: admin only write" on public.conversations
    for all using (public.is_admin(auth.uid()));


-- 6. MESSAGES POLICIES
create policy "Messages select: conversation member or admin" on public.messages
    for select using (
        exists (
            select 1 from public.conversations
            where id = conversation_id
            and (student_id = auth.uid() or senior_id = auth.uid())
        )
        or public.is_admin(auth.uid())
    );

create policy "Messages insert: conversation member and sender" on public.messages
    for insert with check (
        sender_id = auth.uid()
        and exists (
            select 1 from public.conversations
            where id = conversation_id
            and (student_id = auth.uid() or senior_id = auth.uid())
        )
    );


-- 7. SAVED PREFERENCES POLICIES
create policy "Saved preferences: own only" on public.saved_preferences
    for all using (student_id = auth.uid());


-- 8. ROADMAPS POLICIES
create policy "Roadmaps select: student, creator, or admin" on public.roadmaps
    for select using (
        student_id = auth.uid()
        or created_by = auth.uid()
        or public.is_admin(auth.uid())
    );

create policy "Roadmaps write: creator or admin" on public.roadmaps
    for all using (created_by = auth.uid() or public.is_admin(auth.uid()));


-- 9. PREFERENCE REVIEWS POLICIES
create policy "Preference reviews select: student, assigned senior, or admin" on public.preference_reviews
    for select using (
        student_id = auth.uid()
        or senior_id = auth.uid()
        or public.is_admin(auth.uid())
    );

create policy "Preference reviews write: own, assigned senior, or admin" on public.preference_reviews
    for all using (
        student_id = auth.uid()
        or senior_id = auth.uid()
        or public.is_admin(auth.uid())
    );

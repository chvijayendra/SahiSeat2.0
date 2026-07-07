/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  env: {
    VITE_RAZORPAY_KEY_ID: process.env.VITE_RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
  }
};

export default nextConfig;

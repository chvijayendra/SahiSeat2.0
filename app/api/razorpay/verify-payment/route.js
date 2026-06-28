/**
 * app/api/razorpay/verify-payment/route.js
 *
 * POST /api/razorpay/verify-payment
 *
 * Called after the Razorpay Checkout completes on the client.
 * Verifies the HMAC-SHA256 signature using the secret key (server-only).
 * If verified, writes the payment record and corresponding guidance request to Supabase.
 *
 * Body (JSON):
 *   {
 *     razorpay_order_id:   string,
 *     razorpay_payment_id: string,
 *     razorpay_signature:  string,
 *     student_id:          string,
 *     service_type:        string,
 *     remarks?:            string,
 *     college?:            string,
 *     branch?:             string,
 *     amount?:             number   // amount in Rupee (e.g. 99)
 *   }
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabaseService'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      student_id,
      service_type,
      remarks = '',
      college = '',
      branch = '',
      amount = 99,
    } = body

    // ── Validate presence ─────────────────────────────────────────────────────
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required Razorpay signature fields.' },
        { status: 400 }
      )
    }

    if (!student_id || !service_type) {
      return NextResponse.json(
        { error: 'Missing required metadata: student_id, service_type.' },
        { status: 400 }
      )
    }

    // ── Reconstruct the expected signature ───────────────────────────────────
    const signaturePayload = `${razorpay_order_id}|${razorpay_payment_id}`

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signaturePayload)
      .digest('hex')

    // ── Constant-time comparison to prevent timing attacks ───────────────────
    const receivedBuffer = Buffer.from(razorpay_signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')

    const isValid =
      receivedBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(receivedBuffer, expectedBuffer)

    if (!isValid) {
      console.warn('[Razorpay] Signature mismatch for order:', razorpay_order_id)
      return NextResponse.json(
        { verified: false, error: 'Payment signature mismatch. This payment cannot be trusted.' },
        { status: 400 }
      )
    }

    // ── Signature verified, write to database using Service Role ──────────────
    const supabaseService = createServiceRoleClient()

    // 1. Insert Payment
    const { data: paymentData, error: paymentError } = await supabaseService
      .from('payments')
      .insert({
        user_id: student_id,
        razorpay_order_id,
        razorpay_payment_id,
        amount: Number(amount),
        service: service_type,
        status: 'completed',
        currency: 'INR',
        verified_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (paymentError) {
      console.error('[Razorpay DB] Payment record creation failed:', paymentError)
      return NextResponse.json(
        { error: 'Payment verified, but failed to create payment transaction: ' + paymentError.message },
        { status: 500 }
      )
    }

    // 2. Insert Guidance Request
    const { data: requestData, error: requestError } = await supabaseService
      .from('guidance_requests')
      .insert({
        student_id,
        payment_id: paymentData.id,
        service_type,
        remarks: remarks || `${service_type.toUpperCase()} consultation request`,
        college: college || 'Any',
        branch: branch || 'Any',
        status: 'pending',
      })
      .select()
      .single()

    if (requestError) {
      console.error('[Razorpay DB] Guidance request creation failed:', requestError)
      return NextResponse.json(
        { error: 'Payment verified, but failed to register match request: ' + requestError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      verified: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      paymentRecordId: paymentData.id,
      requestRecordId: requestData.id,
      verifiedAt: paymentData.verified_at,
    })
  } catch (err) {
    console.error('[Razorpay] verify-payment API exception:', err)
    return NextResponse.json(
      { error: err.message || 'Payment verification process error.' },
      { status: 500 }
    )
  }
}

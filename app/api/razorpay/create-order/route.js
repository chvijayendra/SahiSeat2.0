/**
 * app/api/razorpay/create-order/route.js
 *
 * POST /api/razorpay/create-order
 *
 * Body (JSON):
 *   {
 *     amount:      number,   // amount in PAISE (e.g. 9900 for ₹99)
 *     currency?:   string,   // default "INR"
 *     receipt?:    string,   // optional receipt id for your records
 *     notes?:      object    // optional key-value metadata
 *   }
 *
 * Response 200:
 *   { orderId, amount, currency, receipt, keyId }
 *
 * Response 4xx / 5xx:
 *   { error: string }
 */

import { NextResponse } from 'next/server'
import getRazorpayInstance from '@/lib/razorpay'

export async function POST(request) {
  try {
    const body = await request.json()
    const { amount, currency = 'INR', receipt, notes } = body

    // ── Validate ─────────────────────────────────────────────────────────────
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Provide a positive number in paise (e.g. 9900 for ₹99).' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(amount)) {
      return NextResponse.json(
        { error: 'Amount must be an integer (paise). Do not pass decimal rupee values.' },
        { status: 400 }
      )
    }

    // ── Create Razorpay Order ─────────────────────────────────────────────────
    const razorpay = getRazorpayInstance()

    const orderOptions = {
      amount,                                    // in paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,  // fallback auto-receipt
      payment_capture: 1,                        // auto-capture on success
      ...(notes && { notes }),
    }

    const order = await razorpay.orders.create(orderOptions)

    return NextResponse.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      receipt:  order.receipt,
      keyId:    process.env.RAZORPAY_KEY_ID,     // safe — this is the public key id
    })
  } catch (err) {
    console.error('[Razorpay] create-order error:', err)

    // Razorpay SDK wraps API errors in err.error
    const message = err?.error?.description || err?.message || 'Failed to create Razorpay order.'
    const status  = err?.statusCode || 500

    return NextResponse.json({ error: message }, { status })
  }
}

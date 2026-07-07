import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabaseService'

export async function POST(request) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    // 1. Validate environment variables
    if (!keySecret) {
      console.error('[Razorpay Backend Error] Missing RAZORPAY_KEY_SECRET')
      return Response.json({
        success: false,
        error: 'Payment verification secret is missing on the server. Please check environment variables.'
      }, { status: 500 })
    }

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
      amount = 0, // amount in Rupees
      create_guidance = false, // flag to control auto-creation of guidance requests
    } = body

    // 2. Validate inputs
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !student_id || !service_type) {
      return Response.json({
        success: false,
        error: 'Missing required fields for payment verification (order ID, payment ID, signature, student ID, and service type).'
      }, { status: 400 })
    }

    // 3. Verify Razorpay Signature
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    const isSignatureValid = generatedSignature === razorpay_signature

    if (!isSignatureValid) {
      console.error('[Razorpay Verification Failure] Signature mismatch.')
      return Response.json({
        success: false,
        verified: false,
        error: 'Payment signature verification failed. The transaction may be fraudulent or corrupted.'
      }, { status: 400 })
    }

    // 4. Initialize Supabase Service Role Client
    const supabase = createServiceRoleClient()

    // 5. Insert transaction record into payments table
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: student_id,
        razorpay_order_id,
        razorpay_payment_id,
        amount: parseFloat(amount),
        service: service_type,
        status: 'captured',
        currency: 'INR',
        verified_at: new Date().toISOString()
      })
      .select()
      .single()

    if (paymentError) {
      console.error('[Database Error] Failed to insert payment record:', paymentError)
      return Response.json({
        success: false,
        error: 'Payment verified, but failed to save transaction record in the database: ' + paymentError.message
      }, { status: 500 })
    }

    // 6. Optionally create a request record in guidance_requests table
    if (create_guidance) {
      const { error: guidanceError } = await supabase
        .from('guidance_requests')
        .insert({
          student_id,
          payment_id: payment.id,
          service_type,
          remarks,
          college,
          branch,
          status: 'pending'
        })

      if (guidanceError) {
        console.error('[Database Error] Failed to create guidance request:', guidanceError)
        return Response.json({
          success: false,
          error: 'Payment verified and saved, but failed to register the counseling request: ' + guidanceError.message
        }, { status: 500 })
      }
    }

    // 7. Return success
    return Response.json({
      success: true,
      verified: true
    })

  } catch (err) {
    console.error('[Razorpay Verify Error]:', err)
    return Response.json({
      success: false,
      error: err.message || 'Internal server error during payment verification.'
    }, { status: 500 })
  }
}

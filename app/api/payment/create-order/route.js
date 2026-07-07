import Razorpay from 'razorpay'

export async function POST(request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    // 1. Validate environment variables
    if (!keyId || !keySecret) {
      console.error('[Razorpay Backend Error] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET')
      return Response.json({
        success: false,
        error: 'Payment gateway configuration is missing on the server. Please check environment variables.'
      }, { status: 500 })
    }

    const body = await request.json()
    const { amount, currency = 'INR', notes = {} } = body

    // 2. Validate amount input
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return Response.json({
        success: false,
        error: 'A valid numeric amount in Rupees is required.'
      }, { status: 400 })
    }

    // Convert amount in Rupees to Paise (e.g. 99 -> 9900)
    const amountInPaise = Math.round(amount * 100)

    // 3. Initialize Razorpay SDK
    const rzp = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    // 4. Create the Razorpay Order
    const orderOptions = {
      amount: amountInPaise,
      currency,
      receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      notes: notes,
    }

    const order = await rzp.orders.create(orderOptions)

    if (!order || !order.id) {
      throw new Error('Razorpay order creation failed or did not return an order ID.')
    }

    // 5. Return success format
    return Response.json({
      success: true,
      order,
      key: keyId
    })

  } catch (err) {
    console.error('[Razorpay Create Order Error]:', err)
    return Response.json({
      success: false,
      error: err.message || 'Failed to create Razorpay payment order. Please try again.'
    }, { status: 500 })
  }
}

/**
 * lib/razorpayClient.js
 *
 * Client-side payment utility — safe to import in React components.
 *
 * This file:
 *   1. Enforces client-side env validation for VITE_RAZORPAY_KEY_ID.
 *   2. Dynamically loads the Razorpay Checkout script from their CDN.
 *   3. Calls our server's /api/payment/create-order to get a Razorpay order.
 *   4. Opens the Razorpay modal.
 *   5. On payment success, calls /api/payment/verify to verify
 *      the HMAC signature server-side and insert DB records.
 *   6. Returns the verified payment details to the caller.
 */

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true)
      return
    }

    const existingScript = document.getElementById('razorpay-checkout-js')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true))
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay script.')))
      return
    }

    const script = document.createElement('script')
    script.id = 'razorpay-checkout-js'
    script.src = RAZORPAY_SCRIPT_URL
    script.async = true
    script.onload  = () => resolve(true)
    script.onerror = () => reject(new Error('Failed to load Razorpay Checkout script. Check your network.'))
    document.body.appendChild(script)
  })
}

/**
 * Opens the Razorpay Checkout modal and handles the full payment flow.
 *
 * @param {object} options
 * @param {number}  options.amountInPaise  - Amount in paise (integer). E.g. 9900 for ₹99.
 * @param {string}  options.student_id     - Student's profile UID.
 * @param {string}  options.service_type   - Service code (chat, voice, preference, roadmap).
 * @param {string}  [options.remarks]      - Consultation remarks.
 * @param {string}  [options.college]      - Target college name.
 * @param {string}  [options.branch]       - Target branch name.
 * @param {string}  [options.name]         - Brand name shown in the modal header.
 * @param {string}  [options.description]  - Short description of the product/service.
 * @param {object}  [options.notes]        - Optional key-value metadata.
 * @param {object}  [options.prefill]      - { name, email, contact } to pre-fill the form.
 * @param {object}  [options.theme]        - { color } hex string.
 * @param {string}  [options.currency]     - Currency, default "INR".
 * @param {boolean} [options.create_guidance] - Flag to automatically insert in guidance_requests table.
 *
 * @returns {Promise<object|null>}
 */
export async function openRazorpayCheckout({
  amountInPaise,
  student_id,
  service_type,
  remarks = '',
  college = '',
  branch = '',
  name        = 'SahiSeat',
  description = 'Payment',
  notes,
  prefill,
  theme       = { color: '#7C3AED' },
  currency    = 'INR',
  create_guidance = false,
}) {
  // ── 1. Validate environment configurations ──────────────────────────────
  const clientKey = process.env.VITE_RAZORPAY_KEY_ID
  if (!clientKey) {
    throw new Error('VITE_RAZORPAY_KEY_ID is missing in client-side environment configurations.')
  }

  // ── 2. Validate input arguments ──────────────────────────────────────────
  if (!amountInPaise || typeof amountInPaise !== 'number' || !Number.isInteger(amountInPaise) || amountInPaise <= 0) {
    throw new Error('amountInPaise must be a positive integer (e.g. 9900 for ₹99).')
  }

  if (!student_id || !service_type) {
    throw new Error('student_id and service_type are required metadata for payment tracking.')
  }

  // ── 3. Load Razorpay checkout script ────────────────────────────────────────
  await loadRazorpayScript()

  // Convert amount in Paise to Rupees for the backend order route
  const amountInRupees = amountInPaise / 100

  // ── 4. Create server-side order ─────────────────────────────────────────────
  const orderRes = await fetch('/api/payment/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount:   amountInRupees,
      currency,
      notes: {
        ...(notes || {}),
        student_id,
        service_type,
        remarks,
        college,
        branch,
      },
    }),
  })

  if (!orderRes.ok) {
    const err = await orderRes.json().catch(() => ({}))
    throw new Error(err.error || `Order creation failed (HTTP ${orderRes.status}).`)
  }

  const { success, order, key } = await orderRes.json()

  if (!success || !order || !order.id || !key) {
    throw new Error('Server did not return a valid order ID or checkout key.')
  }

  // ── 5. Open Razorpay modal ──────────────────────────────────────────────────
  const paymentResult = await new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key:         key,
      order_id:    order.id,
      amount:      order.amount,
      currency:    order.currency || currency,
      name,
      description,
      prefill,
      theme,

      handler: async (response) => {
        try {
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              student_id,
              service_type,
              remarks,
              college,
              branch,
              amount: amountInRupees,
              create_guidance,
            }),
          })

          const verifyData = await verifyRes.json()

          if (!verifyRes.ok || !verifyData.verified) {
            reject(new Error(verifyData.error || 'Signature verification failed.'))
            return
          }

          resolve(verifyData)
        } catch (verifyErr) {
          reject(verifyErr)
        }
      },

      modal: {
        ondismiss: () => resolve(null),
      },
    })

    rzp.on('payment.failed', (failureResponse) => {
      reject(new Error(
        failureResponse?.error?.description ||
        'Payment failed. Please try again.'
      ))
    })

    rzp.open()
  })

  return paymentResult
}

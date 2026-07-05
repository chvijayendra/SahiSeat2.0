/**
 * lib/razorpayClient.js
 *
 * Client-side payment utility — safe to import in React components.
 *
 * This file:
 *   1. Dynamically loads the Razorpay Checkout script from their CDN.
 *   2. Calls our server's /api/razorpay/create-order to get an order id.
 *   3. Opens the Razorpay modal.
 *   4. On payment success, calls /api/razorpay/verify-payment to verify
 *      the HMAC signature server-side and insert DB records.
 *   5. Returns the verified payment details to the caller.
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
 * @param {string}  [options.receipt]      - Optional receipt id.
 * @param {object}  [options.notes]        - Optional key-value metadata.
 * @param {object}  [options.prefill]      - { name, email, contact } to pre-fill the form.
 * @param {object}  [options.theme]        - { color } hex string.
 * @param {string}  [options.currency]     - Currency, default "INR".
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
  receipt,
  notes,
  prefill,
  theme       = { color: '#7C3AED' },
  currency    = 'INR',
}) {
  // ── 1. Validate ─────────────────────────────────────────────────────────────
  if (!amountInPaise || typeof amountInPaise !== 'number' || !Number.isInteger(amountInPaise) || amountInPaise <= 0) {
    throw new Error('amountInPaise must be a positive integer (e.g. 9900 for ₹99).')
  }

  if (!student_id || !service_type) {
    throw new Error('student_id and service_type are required metadata for payment tracking.')
  }

  // ── 2. Load Razorpay checkout script ────────────────────────────────────────
  await loadRazorpayScript()

  // ── 3. Create server-side order ─────────────────────────────────────────────
  const orderRes = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount:   amountInPaise,
      currency,
      ...(receipt && { receipt }),
      notes: {
        ...(notes || {}),
        student_id,
        service_type,
      },
    }),
  })

  if (!orderRes.ok) {
    const err = await orderRes.json().catch(() => ({}))
    throw new Error(err.error || `Order creation failed (HTTP ${orderRes.status}).`)
  }

  const { orderId, keyId } = await orderRes.json()

  if (!orderId || !keyId) {
    throw new Error('Server did not return a valid orderId or keyId.')
  }

  // ── 4. Open Razorpay modal ──────────────────────────────────────────────────
  const paymentResult = await new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key:         keyId,
      order_id:    orderId,
      amount:      amountInPaise,
      currency,
      name,
      description,
      prefill,
      theme,

      handler: async (response) => {
        try {
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
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
              amount: amountInPaise / 100, // store in rupees
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

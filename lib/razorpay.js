/**
 * lib/razorpay.js
 *
 * Server-side Razorpay SDK singleton.
 * Import this ONLY in API routes — never in client components.
 *
 * Credentials are read exclusively from environment variables:
 *   RAZORPAY_KEY_ID      → your Razorpay key id  (server-only)
 *   RAZORPAY_KEY_SECRET  → your Razorpay secret   (server-only, never exposed)
 */

import Razorpay from 'razorpay'

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error(
    '[Razorpay] Missing environment variables. ' +
    'Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in .env.local'
  )
}

// Singleton instance — reused across hot-reloads in development
let razorpayInstance = null

function getRazorpayInstance() {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    })
  }
  return razorpayInstance
}

export default getRazorpayInstance

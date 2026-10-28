import { describe, expect, it, beforeAll } from 'vitest';
import crypto from 'node:crypto';

describe('razorpay signature helpers', () => {
  beforeAll(() => {
    process.env.RAZORPAY_KEY_SECRET = 'test_secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
    process.env.SESSION_SECRET = 'dev-only-session-secret-change-me-32chars';
  });

  it('verifies checkout signature', async () => {
    const { verifyCheckoutSignature } = await import(
      '../integrations/razorpay/razorpay.service.js'
    );
    const orderId = 'order_123';
    const paymentId = 'pay_456';
    const signature = crypto
      .createHmac('sha256', 'test_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    expect(() =>
      verifyCheckoutSignature({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }),
    ).not.toThrow();
    expect(() =>
      verifyCheckoutSignature({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'bad',
      }),
    ).toThrow();
  });

  it('verifies webhook signature against raw body', async () => {
    const { verifyWebhookSignature } = await import(
      '../integrations/razorpay/razorpay.service.js'
    );
    const raw = Buffer.from('{"event":"payment.captured"}');
    const signature = crypto.createHmac('sha256', 'whsec_test').update(raw).digest('hex');
    expect(() => verifyWebhookSignature(raw, signature)).not.toThrow();
  });
});

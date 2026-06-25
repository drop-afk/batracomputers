import api from './api';

let checkoutScriptPromise;

const loadCheckout = () => {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScriptPromise) {
    checkoutScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load the secure payment window'));
      document.body.appendChild(script);
    });
  }
  return checkoutScriptPromise;
};

export const openRazorpayCheckout = async ({ booking, payment, onDismiss }) => {
  await loadCheckout();

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      name: 'Batra Computer',
      description: booking.serviceName,
      order_id: payment.orderId,
      prefill: {
        name: booking.customerName,
        email: booking.customerEmail,
        contact: booking.customerPhone
      },
      notes: { bookingId: booking._id },
      theme: { color: '#2563eb' },
      handler: async (response) => {
        try {
          const verification = await api.post(`/bookings/${booking._id}/verify-payment`, response);
          resolve(verification.data);
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => {
          onDismiss?.();
          resolve(null);
        }
      }
    });

    checkout.on('payment.failed', (response) => {
      reject(new Error(response.error?.description || 'Payment failed. Please try again.'));
    });
    checkout.open();
  });
};

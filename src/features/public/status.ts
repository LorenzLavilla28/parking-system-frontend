type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';

/** Maps a public payment-status label to a badge tone + friendly text. */
export function paymentStatusView(status: string): { tone: Tone; label: string } {
  switch (status) {
    case 'Paid':
      return { tone: 'green', label: 'Paid' };
    case 'Processing':
      return { tone: 'blue', label: 'Processing' };
    case 'AdditionalPaymentRequired':
      return { tone: 'amber', label: 'Additional payment required' };
    case 'Unpaid':
      return { tone: 'amber', label: 'Unpaid' };
    case 'Closed':
      return { tone: 'neutral', label: 'Closed' };
    default:
      return { tone: 'neutral', label: status };
  }
}

/** Whether a session in this state can still be paid online. */
export function isPayable(paymentStatus: string): boolean {
  return paymentStatus === 'Unpaid' || paymentStatus === 'AdditionalPaymentRequired';
}

/**
 * Whether a fresh checkout can be started while a previous one is mid-flight
 * ('Processing'). This lets a customer who cancelled or abandoned a payment start
 * over instead of being stuck — if they actually did pay, polling flips to 'Paid'.
 */
export function isResumable(paymentStatus: string): boolean {
  return paymentStatus === 'Processing';
}

/** Any state from which the payment card (with a pay/resume button) should be shown. */
export function canCheckout(paymentStatus: string): boolean {
  return isPayable(paymentStatus) || isResumable(paymentStatus);
}

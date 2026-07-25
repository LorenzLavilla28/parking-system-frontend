type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';

export function sessionStatusView(status: string): { tone: Tone; label: string } {
  switch (status) {
    case 'ActiveUnpaid':
      return { tone: 'amber', label: 'Unpaid' };
    case 'PaymentPending':
      return { tone: 'red', label: 'Payment pending' };
    case 'PaidExitWindow':
      return { tone: 'green', label: 'Paid' };
    case 'OverstayDue':
      return { tone: 'red', label: 'Overstay due' };
    case 'Exited':
      return { tone: 'neutral', label: 'Exited' };
    case 'Void':
      return { tone: 'neutral', label: 'Void' };
    case 'Cancelled':
      return { tone: 'neutral', label: 'Cancelled' };
    default:
      return { tone: 'neutral', label: status };
  }
}

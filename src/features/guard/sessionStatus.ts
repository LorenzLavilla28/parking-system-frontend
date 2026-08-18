type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';

export function sessionStatusView(status: string): { tone: Tone; label: string } {
  switch (status) {
    case 'ActiveUnpaid':
    case 'PaymentPending':
    case 'PaidExitWindow':
      return { tone: 'blue', label: 'Active' };
    case 'OverstayDue':
      return { tone: 'amber', label: 'Overstay' };
    case 'Exited':
      return { tone: 'neutral', label: 'Closed' };
    case 'Void':
      return { tone: 'neutral', label: 'Void' };
    case 'Cancelled':
      return { tone: 'neutral', label: 'Cancelled' };
    default:
      return { tone: 'neutral', label: status };
  }
}

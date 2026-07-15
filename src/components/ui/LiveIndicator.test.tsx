import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveIndicator } from './LiveIndicator';

describe('LiveIndicator', () => {
  it('labels each connection status', () => {
    const { rerender } = render(<LiveIndicator status="live" />);
    expect(screen.getByRole('status')).toHaveTextContent('Live');

    rerender(<LiveIndicator status="reconnecting" />);
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting');

    rerender(<LiveIndicator status="offline" />);
    expect(screen.getByRole('status')).toHaveTextContent('Offline');
  });

  it('exposes an accessible realtime label', () => {
    render(<LiveIndicator status="live" />);
    expect(screen.getByLabelText('Realtime Live')).toBeInTheDocument();
  });
});

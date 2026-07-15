import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlateNumberInput } from './PlateNumberInput';
import { VehicleTypeSelector } from './VehicleTypeSelector';

describe('guard entry controls', () => {
  it('normalizes plate input while the guard types', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [plate, setPlate] = useState('');
      return <PlateNumberInput value={plate} onChange={setPlate} />;
    }

    render(<Harness />);

    await user.type(screen.getByLabelText(/plate number/i), 'abc--1234');

    expect(screen.getByDisplayValue('ABC 1234')).toBeInTheDocument();
    expect(screen.getByText('Formatted plate: ABC 1234')).toBeInTheDocument();
  });

  it('uses a pressed segmented button for the selected vehicle type', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<VehicleTypeSelector value="Car" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Car' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Motorcycle' }));

    expect(onChange).toHaveBeenCalledWith('Motorcycle');
  });
});

import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Radio } from '@/components/ui/Radio';

describe('Radio', () => {
  it('is checkable by its label and shows the description', async () => {
    render(<Radio name="method" label="Cash" description="Paid on delivery" />);
    const radio = screen.getByRole('radio', { name: /Cash/ });
    expect(radio).not.toBeChecked();
    await userEvent.click(screen.getByText('Cash'));
    expect(radio).toBeChecked();
    expect(screen.getByText('Paid on delivery')).toBeInTheDocument();
  });

  it('forwards its ref to the input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Radio ref={ref} name="method" label="Card" />);
    expect(ref.current).toBe(screen.getByRole('radio'));
  });

  it('ignores clicks while disabled', async () => {
    render(<Radio name="method" label="Cheque" disabled />);
    await userEvent.click(screen.getByText('Cheque'));
    expect(screen.getByRole('radio')).not.toBeChecked();
  });
});

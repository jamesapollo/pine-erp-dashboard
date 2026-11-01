import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Switch } from '@/components/ui/Switch';

describe('Switch', () => {
  it('toggles through onChange', async () => {
    const onChange = vi.fn();
    render(<Switch label="Sellable" checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Sellable' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('ignores clicks while disabled', async () => {
    const onChange = vi.fn();
    render(<Switch label="Sellable" checked={false} disabled onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Sellable' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses aria-label when there is no visible label', () => {
    render(<Switch aria-label="Featured" checked onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'Featured' })).toBeChecked();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Checkbox } from '@/components/ui/Checkbox';

describe('Checkbox', () => {
  it('toggles through onChange and shows its description', async () => {
    const onChange = vi.fn();
    render(
      <Checkbox
        label="View orders"
        description="See every order"
        checked={false}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /View orders/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByText('See every order')).toBeVisible();
  });

  it('reflects the checked state', () => {
    render(<Checkbox label="View orders" checked onChange={() => {}} />);
    expect(screen.getByRole('checkbox', { name: 'View orders' })).toBeChecked();
  });

  it('ignores clicks while disabled', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="View orders" checked={false} disabled onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'View orders' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

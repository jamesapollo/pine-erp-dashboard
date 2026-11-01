import { render, screen } from '@testing-library/react';

import { StatusBadge } from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('renders the label for a known status', () => {
    render(<StatusBadge kind="product" status="archived" />);
    expect(screen.getByText('Archived')).toBeVisible();
  });

  it('falls back to the status with underscores replaced', () => {
    render(<StatusBadge kind="product" status="on_hold" />);
    expect(screen.getByText('on hold')).toBeVisible();
  });

  it('prefers an explicit label', () => {
    render(<StatusBadge kind="product" status="draft" label="Not live" />);
    expect(screen.getByText('Not live')).toBeVisible();
  });
});

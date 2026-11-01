import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Tabs } from '@/components/ui/Tabs';

const items = [
  { value: 'all', label: 'All', count: 12 },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

describe('Tabs', () => {
  it('calls onChange with the clicked tab value', async () => {
    const onChange = vi.fn();
    render(<Tabs label="Status" items={items} value="all" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Draft' }));
    expect(onChange).toHaveBeenCalledWith('draft');
  });

  it('marks only the active tab as selected', () => {
    render(<Tabs label="Status" items={items} value="draft" onChange={() => {}} />);
    expect(screen.getByRole('tablist', { name: 'Status' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Draft' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /^All\s*12$/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('renders the count inside its tab', () => {
    render(<Tabs label="Status" items={items} value="all" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /^All\s*12$/ })).toHaveTextContent('12');
  });

  it('moves focus with the arrow keys', async () => {
    render(<Tabs label="Status" items={items} value="all" onChange={() => {}} />);
    screen.getByRole('tab', { name: /^All\s*12$/ }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Draft' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Published' })).toHaveFocus();
  });
});

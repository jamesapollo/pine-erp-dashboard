import { render, screen, within } from '@testing-library/react';
import { Check } from 'lucide-react';

import { Timeline } from '@/components/ui/Timeline';

describe('Timeline', () => {
  it('renders titles, times, meta and notes in order', () => {
    render(
      <Timeline
        items={[
          {
            id: 'placed',
            title: 'Order placed',
            time: '1 Nov, 09:00',
            meta: 'by Amina',
            tone: 'filled',
          },
          {
            id: 'confirmed',
            title: 'Confirmed',
            note: 'Customer called',
            icon: Check,
            tone: 'success',
          },
          { id: 'plain', title: 'Plain step' },
        ]}
      />,
    );

    const entries = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(entries).toHaveLength(3);
    expect(entries[0]).toHaveTextContent('Order placed');
    expect(entries[0]).toHaveTextContent('1 Nov, 09:00');
    expect(entries[0]).toHaveTextContent('by Amina');
    expect(entries[1]).toHaveTextContent('Confirmed');
    expect(entries[1]).toHaveTextContent('Customer called');
    expect(entries[2]).toHaveTextContent('Plain step');
  });
});

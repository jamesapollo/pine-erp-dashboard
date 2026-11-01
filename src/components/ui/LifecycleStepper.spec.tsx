import { render, screen } from '@testing-library/react';

import { LifecycleStepper } from '@/components/ui/LifecycleStepper';

const steps = [
  { label: 'Pending', time: '1 Nov' },
  { label: 'Confirmed' },
  { label: 'Dispatched' },
  { label: 'Completed' },
];

function getState(label: string) {
  return screen.getByText(label).closest('[data-state]')?.getAttribute('data-state');
}

describe('LifecycleStepper', () => {
  it('marks steps done, current and todo around the current index', () => {
    const { container } = render(<LifecycleStepper steps={steps} current={1} />);
    expect(['Pending', 'Confirmed', 'Dispatched', 'Completed'].map(getState)).toEqual([
      'done',
      'current',
      'todo',
      'todo',
    ]);
    expect(screen.getByText('1 Nov')).toBeInTheDocument();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('treats the reached steps as done without a check when cancelled', () => {
    const { container } = render(<LifecycleStepper steps={steps} current={1} cancelled />);
    expect(['Pending', 'Confirmed', 'Dispatched', 'Completed'].map(getState)).toEqual([
      'done',
      'done',
      'todo',
      'todo',
    ]);
    expect(container.querySelectorAll('svg')).toHaveLength(0);
  });
});

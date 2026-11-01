import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ToastContextProvider, useToastContext } from '@/components/ui/ToastContext';

function Trigger() {
  const { showToast } = useToastContext();
  return (
    <button
      type="button"
      onClick={() => showToast({ title: 'Product saved', description: 'Ankara wrap dress' })}
    >
      Save
    </button>
  );
}

function renderWithProvider() {
  return render(
    <ToastContextProvider>
      <Trigger />
    </ToastContextProvider>,
  );
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the title and description in a status region', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Product saved');
    expect(status).toHaveTextContent('Ankara wrap dress');
  });

  it('dismisses itself after 5000 ms', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    act(() => {
      vi.advanceTimersByTime(4900);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('removes the toast immediately on Dismiss', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('stacks several toasts, newest last', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });
});

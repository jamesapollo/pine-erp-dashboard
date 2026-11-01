import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Dialog } from '@/components/ui/Dialog';

describe('Dialog', () => {
  it('renders nothing while closed', () => {
    render(
      <Dialog isOpen={false} title="Discard changes?" onClose={() => {}}>
        Body
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a modal dialog named by its title', () => {
    render(
      <Dialog isOpen title="Discard changes?" description="Edits will be lost." onClose={() => {}}>
        Body
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Discard changes?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Edits will be lost.');
  });

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen title="Discard changes?" onClose={onClose}>
        Body
      </Dialog>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the overlay is clicked but not the dialog', async () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen title="Discard changes?" onClose={onClose}>
        Body
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('dialog-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wraps Tab from the last focusable element to the first, and Shift+Tab back', async () => {
    render(
      <Dialog
        isOpen
        title="Discard changes?"
        onClose={() => {}}
        footer={<button type="button">Discard</button>}
      >
        Body
      </Dialog>,
    );
    const close = screen.getByRole('button', { name: 'Close' });
    const discard = screen.getByRole('button', { name: 'Discard' });
    expect(close).toHaveFocus();
    await userEvent.tab();
    expect(discard).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(discard).toHaveFocus();
  });

  it('returns focus to the opener when closed', async () => {
    function Harness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open
          </button>
          <Dialog isOpen={isOpen} title="Discard changes?" onClose={() => setIsOpen(false)}>
            Body
          </Dialog>
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

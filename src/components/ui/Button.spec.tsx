import { render, screen } from '@testing-library/react';

import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('is disabled and marked busy while loading', () => {
    render(<Button isLoading>Sign in</Button>);

    const button = screen.getByRole('button', { name: /sign in/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

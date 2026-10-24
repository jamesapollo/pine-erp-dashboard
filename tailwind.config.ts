import type { Config } from 'tailwindcss';

function variableRamp(name: string, steps: number[]) {
  return Object.fromEntries(steps.map((step) => [step, `var(--${name}-${step})`]));
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: variableRamp('brand', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        neutral: {
          0: 'var(--neutral-0)',
          ...variableRamp('neutral', [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        },
        clay: variableRamp('clay', [50, 100, 500, 600, 700]),
        success: variableRamp('success', [50, 100, 500, 600, 700]),
        warning: variableRamp('warning', [50, 100, 500, 600, 700]),
        danger: variableRamp('danger', [50, 100, 500, 600, 700]),
        info: variableRamp('info', [50, 100, 500, 600, 700]),
        'surface-app': 'var(--surface-app)',
        'surface-card': 'var(--surface-card)',
        'surface-sunken': 'var(--surface-sunken)',
        'surface-hover': 'var(--surface-hover)',
        'surface-sidebar': 'var(--surface-sidebar)',
        'border-default': 'var(--border-default)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        'border-focus': 'var(--border-focus)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-disabled': 'var(--text-disabled)',
        'text-link': 'var(--text-link)',
        'action-primary': 'var(--action-primary)',
        'action-primary-hover': 'var(--action-primary-hover)',
        'action-danger': 'var(--action-danger)',
        'action-danger-hover': 'var(--action-danger-hover)',
      },
      borderRadius: {
        chip: '4px',
        control: '6px',
        card: '10px',
        dialog: '14px',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        focus: 'var(--focus-ring)',
        'focus-danger': 'var(--focus-ring-danger)',
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans Variable"',
          '"Plus Jakarta Sans"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"SFMono-Regular"', 'Menlo', 'monospace'],
      },
      width: { sidebar: '236px' },
      height: { topbar: '56px' },
      transitionTimingFunction: { out: 'var(--ease-out)' },
    },
  },
} satisfies Config;

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'stone',
    },
    button: {
      slots: {
        base: 'font-semibold rounded-[var(--radius-control)]',
      },
      defaultVariants: {
        color: 'primary',
        size: 'md',
      },
    },
    input: {
      slots: {
        base: 'rounded-[var(--radius-control)]',
      },
      defaultVariants: {
        color: 'neutral',
        size: 'md',
      },
    },
    select: {
      slots: {
        base: 'rounded-[var(--radius-control)]',
      },
      defaultVariants: {
        color: 'neutral',
        size: 'md',
      },
    },
    textarea: {
      slots: {
        base: 'rounded-[var(--radius-control)]',
      },
      defaultVariants: {
        color: 'neutral',
        size: 'md',
      },
    },
    badge: {
      defaultVariants: {
        color: 'neutral',
        variant: 'soft',
        size: 'sm',
      },
    },
  },
})

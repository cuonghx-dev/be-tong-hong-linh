import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

// App chỉ có light theme (không dùng next-themes) → cố định theme="light".
const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    position="bottom-right"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast: 'group toast group-[.toaster]:border-border group-[.toaster]:shadow-lg',
        description: 'group-[.toast]:text-slate-500',
        actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
        cancelButton: 'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500',
      },
    }}
    {...props}
  />
)

export { Toaster }

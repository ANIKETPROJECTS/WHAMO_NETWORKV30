import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

function ToastIcon({ variant }: { variant?: string }) {
  if (variant === 'success') return <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />
  if (variant === 'warning') return <AlertTriangle className="h-5 w-5 shrink-0 text-white" />
  if (variant === 'destructive') return <XCircle className="h-5 w-5 shrink-0 text-destructive-foreground" />
  return <Info className="h-5 w-5 shrink-0 text-foreground/70" />
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={4000}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex items-start gap-3 w-full min-w-0">
              <ToastIcon variant={props.variant} />
              <div className="grid gap-1 min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

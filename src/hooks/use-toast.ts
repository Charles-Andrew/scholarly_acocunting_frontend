"use client"

import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
}

function toast(props: ToastProps & { variant?: "default" | "success" | "info" | "warning" | "error" | "loading" }) {
  const { title, description, ...options } = props
  sonnerToast(title, {
    description,
    ...options,
  })
}

// Convenience methods
toast.success = (props: ToastProps) =>
  toast({ ...props, variant: "success" })

toast.error = (props: ToastProps) =>
  toast({ ...props, variant: "error" })

toast.warning = (props: ToastProps) =>
  toast({ ...props, variant: "warning" })

toast.info = (props: ToastProps) =>
  toast({ ...props, variant: "info" })

toast.loading = (props: ToastProps) =>
  toast({ ...props, variant: "loading" })

export { toast }

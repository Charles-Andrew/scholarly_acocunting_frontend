"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  /**
   * The trigger button element or label
   */
  trigger: React.ReactNode
  /**
   * Dialog title
   */
  title: string
  /**
   * Dialog description (optional)
   */
  description?: string
  /**
   * Confirm button text
   * @default "Confirm"
   */
  confirmText?: string
  /**
   * Cancel button text
   * @default "Cancel"
   */
  cancelText?: string
  /**
   * Confirm button variant
   * @default "default"
   */
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  /**
   * Whether the dialog is open (controlled)
   */
  open?: boolean
  /**
   * Callback when open state changes
   */
  onOpenChange?: (open: boolean) => void
  /**
   * Callback when confirmed
   */
  onConfirm: () => void | Promise<void>
  /**
   * Whether the confirm action is loading
   */
  loading?: boolean
  /**
   * Additional class names for the content
   */
  className?: string
  /**
   * Size of the dialog
   * @default "default"
   */
  size?: "default" | "sm"
  /**
   * Destructive action (shows red confirm button)
   * @default false
   */
  destructive?: boolean
}

/**
 * Reusable confirmation dialog component
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   trigger={<Button variant="destructive">Delete</Button>}
 *   title="Delete Client"
 *   description="Are you sure you want to delete this client? This action cannot be undone."
 *   onConfirm={async () => {
 *     await deleteClient(id)
 *     toast.success("Client deleted")
 *   }}
 *   destructive
 * />
 * ```
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "default",
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  className,
  size = "default",
  destructive = false,
}: ConfirmDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isConfirming, setIsConfirming] = React.useState(false)

  const isControlled = open !== undefined
  const currentOpen = isControlled ? open : isOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setIsOpen(newOpen)
    } else {
      onOpenChange?.(newOpen)
    }
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
      handleOpenChange(false)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <AlertDialog open={currentOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent size={size} className={className}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading || isConfirming}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : confirmVariant}
            disabled={loading || isConfirming}
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            {isConfirming ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Convenience component for inline usage with children
interface ConfirmButtonProps {
  /**
   * Button children (label or icon)
   */
  children: React.ReactNode
  /**
   * Button className (if using as child wrapper)
   */
  className?: string
  /**
   * Dialog title
   */
  title: string
  /**
   * Dialog description (optional)
   */
  description?: string
  /**
   * Confirm button text
   * @default "Confirm"
   */
  confirmText?: string
  /**
   * Cancel button text
   * @default "Cancel"
   */
  cancelText?: string
  /**
   * Confirm button variant
   * @default "default"
   */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  /**
   * Button size
   */
  size?: "default" | "sm" | "lg" | "icon"
  /**
   * Callback when confirmed
   */
  onConfirm: () => void | Promise<void>
  /**
   * Whether the confirm action is loading
   */
  loading?: boolean
  /**
   * Destructive action (shows red confirm button)
   * @default false
   */
  destructive?: boolean
}

/**
 * Convenience component that wraps a button with confirmation dialog
 *
 * @example
 * ```tsx
 * <ConfirmButton
 *   variant="destructive"
 *   title="Delete Client"
 *   description="Are you sure you want to delete this client?"
 *   onConfirm={async () => {
 *     await deleteClient(id)
 *     toast.success("Client deleted")
 *   }}
 * >
 *   <TrashIcon className="h-4 w-4" />
 * </ConfirmButton>
 * ```
 */
export function ConfirmButton({
  children,
  className,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  size,
  onConfirm,
  loading = false,
  destructive = false,
}: ConfirmButtonProps) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant={variant}
          size={size}
          className={cn("cursor-pointer", className)}
          disabled={loading}
        >
          {children}
        </Button>
      }
      title={title}
      description={description}
      confirmText={confirmText}
      cancelText={cancelText}
      confirmVariant={variant}
      onConfirm={onConfirm}
      loading={loading}
      destructive={destructive}
    />
  )
}

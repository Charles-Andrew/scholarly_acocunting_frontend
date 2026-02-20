import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Invoice } from "@/lib/types/invoice"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(d)
}

type InvoiceStatus = Invoice["status"]
export type InvoiceStatusBadgeVariant = "default" | "secondary" | "destructive" | "outline"

export const INVOICE_STATUS_VARIANTS: Record<InvoiceStatus, InvoiceStatusBadgeVariant> = {
  draft: "secondary",
  for_approval: "outline",
  approved: "default",
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  for_approval: "For Approval",
  approved: "Approved",
}

export function getInvoiceStatusVariant(status: string): InvoiceStatusBadgeVariant {
  return INVOICE_STATUS_VARIANTS[status as InvoiceStatus] || "outline"
}

export function getInvoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_LABELS[status as InvoiceStatus] || status
}

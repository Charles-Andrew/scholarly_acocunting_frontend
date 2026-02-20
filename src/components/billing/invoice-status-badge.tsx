import { Badge } from "@/components/ui/badge"
import { getInvoiceStatusLabel, getInvoiceStatusVariant } from "@/lib/utils"

interface InvoiceStatusBadgeProps {
  status: string
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  return (
    <Badge variant={getInvoiceStatusVariant(status)}>{getInvoiceStatusLabel(status)}</Badge>
  )
}

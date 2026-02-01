"use client"

import * as React from "react"
import { PDFViewer } from "@react-pdf/renderer"
import { Send, Loader2, RefreshCcw, Eye, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import type { Invoice, LineItem } from "@/lib/types/invoice"
import { InvoicePDFDocument } from "./InvoicePDF"

interface SendEmailDialogProps {
  invoice: Invoice | null
  lineItems: LineItem[]
  clientEmail?: string
  clientName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent?: () => void
}

const DEFAULT_FROM = "billing@scholarlyconsulting.co"
const DEFAULT_REPLY_TO = "accounting@scholarlyconsulting.co"

const DEFAULT_SUBJECT = "Invoice {{invoice_number}} from Scholarly Accounting"

const DEFAULT_BODY_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
    .amount { font-size: 24px; font-weight: bold; color: #000; }
    .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Invoice {{invoice_number}}</h2>
    </div>

    <p>Hi {{customer_name}},</p>

    <p>Please find your invoice attached. Here are the details:</p>

    <p>
      <strong>Invoice Number:</strong> {{invoice_number}}<br>
      <strong>Amount Due:</strong> <span class="amount">{{amount_due}}</span><br>
      <strong>Due Date:</strong> {{due_date}}
    </p>

    <a href="{{payment_link}}" class="button">Pay Now</a>

    <p>Questions about this invoice? Simply reply to this email.</p>

    <div class="footer">
      <p>Thank you for your business,<br>Scholarly Accounting</p>
    </div>
  </div>
</body>
</html>`

const TEMPLATE_VARIABLES = [
  { key: "invoice_number", description: "Invoice number" },
  { key: "customer_name", description: "Customer name" },
  { key: "amount_due", description: "Amount due (formatted)" },
  { key: "due_date", description: "Due date (formatted)" },
  { key: "payment_link", description: "Payment link" },
]

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "")
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function getDueDate(dateStr: string): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + 30)
  return formatDate(date.toISOString())
}

export function SendEmailDialog({
  invoice,
  lineItems,
  clientEmail = "",
  clientName = "",
  open,
  onOpenChange,
  onSent,
}: SendEmailDialogProps) {
  const supabase = createClient()
  const [isSending, setIsSending] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("compose")

  // Email form state
  const [to, setTo] = React.useState(clientEmail)
  const [from, setFrom] = React.useState(DEFAULT_FROM)
  const [replyTo, setReplyTo] = React.useState(DEFAULT_REPLY_TO)
  const [subject, setSubject] = React.useState("")
  const [bodyHtml, setBodyHtml] = React.useState("")

  const getTemplateVariables = React.useCallback((): Record<string, string> => {
    if (!invoice) return {}
    return {
      invoice_number: invoice.invoice_number,
      customer_name: clientName || "Valued Customer",
      amount_due: formatCurrency(invoice.amount_due),
      due_date: getDueDate(invoice.date),
      payment_link: `${window.location.origin}/billing-invoice/${invoice.id}/pay`,
    }
  }, [invoice, clientName])

  const resetTemplate = React.useCallback(() => {
    const vars = getTemplateVariables()
    setSubject(renderTemplate(DEFAULT_SUBJECT, vars))
    setBodyHtml(DEFAULT_BODY_HTML)
  }, [getTemplateVariables])

  // Initialize template when invoice changes
  React.useEffect(() => {
    if (invoice && open) {
      setTo(clientEmail)
      resetTemplate()
    }
  }, [invoice, open, clientEmail, resetTemplate])

  const handleSend = async () => {
    if (!invoice) return

    if (!to.trim()) {
      toast({
        title: "Error",
        description: "Please enter a recipient email address.",
        variant: "error",
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "error",
      })
      return
    }

    setIsSending(true)

    try {
      const vars = getTemplateVariables()
      const renderedSubject = renderTemplate(subject, vars)
      const renderedBody = renderTemplate(bodyHtml, vars)

      const { data, error } = await supabase.functions.invoke("send-invoice", {
        body: {
          invoice_id: invoice.id,
          to: to.trim(),
          from: from.trim() || DEFAULT_FROM,
          reply_to: replyTo.trim() || DEFAULT_REPLY_TO,
          subject: renderedSubject,
          body_html: renderedBody,
        },
      })

      if (error) {
        throw new Error(error.message || "Failed to send email")
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      toast({
        title: "Email Sent",
        description: `Invoice ${invoice.invoice_number} sent to ${to}.`,
      })

      onOpenChange(false)
      onSent?.()
    } catch (err) {
      console.error("Send error:", err)
      toast({
        title: "Failed to Send",
        description: err instanceof Error ? err.message : "An error occurred while sending the email.",
        variant: "error",
      })
    } finally {
      setIsSending(false)
    }
  }

  if (!invoice) return null

  const pdfData = {
    invoice_number: invoice.invoice_number,
    date: invoice.date,
    amount_due: invoice.amount_due,
    discount: invoice.discount,
    grand_total: invoice.grand_total,
    client_name: clientName,
    client_email: clientEmail,
    items: lineItems,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Invoice Email
          </DialogTitle>
          <DialogDescription>
            Preview the invoice and customize the email before sending.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Compose Email
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              PDF Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4 mt-4">
            {/* Recipients */}
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  type="email"
                  placeholder="client@example.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="from">From</Label>
                  <Input
                    id="from"
                    type="email"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reply-to">Reply-To</Label>
                  <Input
                    id="reply-to"
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <hr />

            {/* Subject */}
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
              />
            </div>

            {/* Body */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Message (HTML)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetTemplate}
                  className="h-auto py-1 px-2"
                >
                  <RefreshCcw className="h-3 w-3 mr-1" />
                  Reset to Default
                </Button>
              </div>
              <Textarea
                id="body"
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                placeholder="HTML email content"
              />
            </div>

            {/* Template Variables Help */}
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Available template variables:
              </p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_VARIABLES.map((variable) => (
                  <code
                    key={variable.key}
                    className="text-xs bg-background px-2 py-1 rounded border"
                    title={variable.description}
                  >
                    {"{{"}{variable.key}{"}}"}
                  </code>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div className="border rounded-md overflow-hidden" style={{ height: "500px" }}>
              <PDFViewer width="100%" height="100%" showToolbar>
                <InvoicePDFDocument data={pdfData} />
              </PDFViewer>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || !to.trim()}
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Printer, CheckCircle2, Send } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import type { Invoice } from "@/lib/types/invoice"

type LineItem = {
  id: string
  description: string
  amount: number
}

type Client = {
  id: string
  name: string
  accounts_receivable_code: string | null
}

type IncomeCategory = {
  id: string
  name: string
}

type BankAccount = {
  id: string
  name: string
  bank_name: string
  account_number: string
}

type User = {
  id: string
  email: string
  full_name?: string
}

interface ViewBillingInvoicePageProps {
  params: Promise<{
    id: string
  }>
}

export default function ViewBillingInvoicePage({ params }: ViewBillingInvoicePageProps) {
  const resolvedParams = React.use(params)
  const router = useRouter()
  const supabase = createClient()
  const [invoice, setInvoice] = React.useState<Invoice | null>(null)
  const [lineItems, setLineItems] = React.useState<LineItem[]>([])
  const [clients, setClients] = React.useState<Client[]>([])
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([])
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([])
  const [users, setUsers] = React.useState<User[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [preparedBySignature, setPreparedBySignature] = React.useState<string | null>(null)
  const [approvedBySignature, setApprovedBySignature] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("billing_invoices")
        .select("*, sent_to_client_at, signed, signed_at")
        .eq("id", resolvedParams.id)
        .single()

      if (invoiceError) throw invoiceError

      // Fetch line items
      const { data: itemsData, error: itemsError } = await supabase
        .from("billing_invoice_items")
        .select("*")
        .eq("invoice_id", resolvedParams.id)

      if (itemsError) throw itemsError

      // Fetch related data
      const [clientsData, categoriesData, bankData, usersData] = await Promise.all([
        supabase.from("clients").select("id, name, accounts_receivable_code").order("name"),
        supabase.from("income_categories").select("id, name").order("name"),
        supabase.from("bank_accounts").select("id, name, bank_name, account_number"),
        supabase.from("user_profiles").select("id, email, full_name"),
      ])

      setInvoice(invoiceData)
      setLineItems(
        (itemsData || []).map((item) => ({
          id: item.id,
          description: item.description,
          amount: item.amount,
        }))
      )
      if (clientsData.data) setClients(clientsData.data)
      if (categoriesData.data) setIncomeCategories(categoriesData.data)
      if (bankData.data) setBankAccounts(bankData.data)
      if (usersData.data) {
        const formattedUsers = usersData.data.map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name || u.email?.split("@")[0] || u.email,
        }))
        setUsers(formattedUsers)

        // Fetch signatures for prepared_by and approved_by
        if (invoiceData.prepared_by) {
          const { data: preparedSig } = await supabase
            .from("user_profiles")
            .select("signature_image")
            .eq("id", invoiceData.prepared_by)
            .single()
          setPreparedBySignature(preparedSig?.signature_image || null)
        }

        if (invoiceData.approved_by) {
          const { data: approvedSig } = await supabase
            .from("user_profiles")
            .select("signature_image")
            .eq("id", invoiceData.approved_by)
            .single()
          setApprovedBySignature(approvedSig?.signature_image || null)
        }
      }
    } catch (error) {
      console.error("Error fetching invoice:", error)
      toast.error({
        title: "Error",
        description: "Failed to load invoice data.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, resolvedParams.id])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const client = clients.find((c) => c.id === invoice?.client_id)
  const incomeCategory = incomeCategories.find((c) => c.id === invoice?.income_category_id)
  const bankAccount = bankAccounts.find((b) => b.id === invoice?.bank_account_id)
  const preparedBy = users.find((u) => u.id === invoice?.prepared_by)
  const approvedBy = users.find((u) => u.id === invoice?.approved_by)

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      for_approval: "outline",
      approved: "default",
    }
    const labels: Record<string, string> = {
      draft: "Draft",
      for_approval: "For Approval",
      approved: "Approved",
    }
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>
  }

  const handleApprove = async () => {
    try {
      const response = await fetch(`/api/billing-invoices/${resolvedParams.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve invoice")
      }

      toast.success({
        title: "Invoice Approved",
        description: "The invoice has been approved.",
      })
      router.replace("/billing-invoice")
    } catch (error) {
      console.error("Error approving invoice:", error)
      toast.error({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve invoice.",
      })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSendToClient = async () => {
    try {
      // TODO: Implement email sending logic

      // Update the sent_to_client_at timestamp
      const { error: updateError } = await supabase
        .from("billing_invoices")
        .update({ sent_to_client_at: new Date().toISOString() })
        .eq("id", resolvedParams.id)

      if (updateError) throw updateError

      // Refresh the invoice data to update the UI
      await fetchData()

      toast.success({
        title: "Invoice Sent",
        description: `Invoice has been sent to ${client?.name || "client"}.`,
      })
    } catch (error) {
      console.error("Error sending invoice:", error)
      toast.error({
        title: "Error",
        description: "Failed to send invoice to client.",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/billing-invoice">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Loading...</h1>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/billing-invoice">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Invoice Not Found</h1>
        </div>
      </div>
    )
  }

  if (invoice.status !== "for_approval" && invoice.status !== "approved") {
    toast.info({
      title: "Access Restricted",
      description: "Only invoices with status 'For Approval' or 'Approved' can be viewed.",
    })
    router.replace("/billing-invoice")
    return null
  }

  return (
    <div className="space-y-6 p-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/billing-invoice">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Billing Invoice</h1>
          {getStatusBadge(invoice.status)}
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === "for_approval" && currentUserId === invoice.approved_by && (
            <Button variant="outline" onClick={handleApprove}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          )}
          {invoice.status === "approved" && (
            <Button variant="default" onClick={handleSendToClient}>
              <Send className="mr-2 h-4 w-4" />
              Send to Client
            </Button>
          )}
          {invoice.sent_to_client_at && (
            <span className="text-sm text-muted-foreground">
              Last sent: {formatDate(invoice.sent_to_client_at)}
            </span>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Document - Excel-like format */}
      <div className="border rounded-lg overflow-hidden bg-white" id="invoice-print">
        {/* Header */}
        <div className="bg-gray-50 border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Scholarly</h2>
              <p className="text-sm text-gray-500 mt-1">Accounting Services</p>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-semibold text-gray-900">INVOICE</h1>
              <p className="text-sm text-gray-500 mt-1">{invoice.invoice_number}</p>
            </div>
          </div>
        </div>

        {/* Invoice Info Grid */}
        <div className="border-b p-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Bill To</h3>
              <div className="space-y-1">
                <p className="font-medium text-gray-900">{client?.name || "-"}</p>
                {client?.accounts_receivable_code && (
                  <p className="text-sm text-gray-500">A/R Code: {client.accounts_receivable_code}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Date</h3>
                <p className="text-sm text-gray-900">{formatDate(invoice.date)}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Category</h3>
                <p className="text-sm text-gray-900">{incomeCategory?.name || "-"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="border-b">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left text-sm font-semibold text-gray-500 uppercase tracking-wider p-4">Description</th>
                <th className="text-right text-sm font-semibold text-gray-500 uppercase tracking-wider p-4 w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="p-4 text-sm text-gray-900">{item.description}</td>
                  <td className="p-4 text-sm text-gray-900 text-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-b p-6">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Grand Total</span>
                <span className="text-gray-900">{formatCurrency(invoice.grand_total)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-gray-900">-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold border-t pt-2">
                <span className="text-gray-900">Amount Due</span>
                <span className="text-gray-900">{formatCurrency(invoice.amount_due)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        {bankAccount && (
          <div className="border-b p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Method</h3>
            <p className="text-sm text-gray-900">
              {bankAccount.name} - {bankAccount.bank_name} ({bankAccount.account_number})
            </p>
          </div>
        )}

        {/* Signatures */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-8">
            <div className="relative h-20">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Prepared By</h3>
              <p className="text-sm text-gray-900 text-center">{preparedBy?.full_name || preparedBy?.email || "-"}</p>
              {(invoice.status === "for_approval" || invoice.status === "approved") && preparedBySignature && (
                <img
                  src={preparedBySignature}
                  alt="Signature"
                  className="absolute left-1/2 -translate-x-1/2 h-16 max-w-[200px] object-contain z-10"
                  style={{ top: "5px" }}
                />
              )}
            </div>
            <div className="relative h-20">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Approved By</h3>
              <p className="text-sm text-gray-900 text-center">{approvedBy?.full_name || approvedBy?.email || "-"}</p>
              {invoice.status === "approved" && approvedBySignature && (
                <img
                  src={approvedBySignature}
                  alt="Signature"
                  className="absolute left-1/2 -translate-x-1/2 h-16 max-w-[200px] object-contain z-10"
                  style={{ top: "5px" }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print, #invoice-print * {
            visibility: visible;
          }
          #invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

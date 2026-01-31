"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Printer, CheckCircle2, Send, Signature, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import type { Invoice, LineItem, BillingInvoiceUser } from "@/lib/types/invoice"
import type { Client, IncomeCategory } from "@/lib/types"
import type { BankAccount } from "@/lib/types/bank-account"

interface ViewBillingInvoicePageProps {
  params: Promise<{
    id: string
  }>
}

const LOGO_URL = "https://gjrdshqnjalyivzeciyu.supabase.co/storage/v1/object/public/company-logos/scholarly_logo.png"

export default function ViewBillingInvoicePage({ params }: ViewBillingInvoicePageProps) {
  const resolvedParams = React.use(params)
  const router = useRouter()
  const supabase = createClient()
  const [invoice, setInvoice] = React.useState<Invoice | null>(null)
  const [lineItems, setLineItems] = React.useState<LineItem[]>([])
  const [clients, setClients] = React.useState<Client[]>([])
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([])
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([])
  const [users, setUsers] = React.useState<BillingInvoiceUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [preparedBySignature, setPreparedBySignature] = React.useState<{ signature_image: string; signed_at: string } | null>(null)
  const [approvedBySignature, setApprovedBySignature] = React.useState<{ signature_image: string; signed_at: string } | null>(null)
  const [isTogglingSignature, setIsTogglingSignature] = React.useState(false)

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
        .select("*, sent_to_client_at")
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
        supabase.from("clients").select("id, name, accounts_receivable_code, created_at, updated_at").order("name"),
        supabase.from("income_categories").select("id, name, slug, created_at, updated_at").order("name"),
        supabase.from("bank_accounts").select("id, name, bank_name, account_number, created_at, updated_at"),
        supabase.from("user_profiles").select("id, email, full_name, position"),
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
          position: u.position,
        }))
        setUsers(formattedUsers)

        // Fetch signatures from invoice_signatures table
        const { data: signatures } = await supabase
          .from("invoice_signatures")
          .select("signature_type, signature_image, signed_at")
          .eq("invoice_id", resolvedParams.id)

        if (signatures) {
          signatures.forEach((sig) => {
            if (sig.signature_type === "prepared_by") {
              setPreparedBySignature({
                signature_image: sig.signature_image,
                signed_at: sig.signed_at,
              })
            } else if (sig.signature_type === "approved_by") {
              setApprovedBySignature({
                signature_image: sig.signature_image,
                signed_at: sig.signed_at,
              })
            }
          })
        }
      }
    } catch {
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
    } catch (_error) {
      toast.error({
        title: "Error",
        description: _error instanceof Error ? _error.message : "Failed to approve invoice.",
      })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleToggleSignature = async (signatureType: "prepared_by" | "approved_by") => {
    const hasSignature = signatureType === "prepared_by" ? preparedBySignature : approvedBySignature

    setIsTogglingSignature(true)
    try {
      if (hasSignature) {
        // Remove signature
        const response = await fetch(`/api/billing-invoices/${resolvedParams.id}/signature`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signatureType }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to remove signature")
        }

        if (signatureType === "prepared_by") {
          setPreparedBySignature(null)
        } else {
          setApprovedBySignature(null)
        }

        toast.success({
          title: "Signature Removed",
          description: "Your signature has been removed from this invoice.",
        })
      } else {
        // Add signature
        const response = await fetch(`/api/billing-invoices/${resolvedParams.id}/signature`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signatureType }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to add signature")
        }

        // Get current user's signature image
        const userProfile = await supabase
          .from("user_profiles")
          .select("signature_image")
          .eq("id", currentUserId)
          .single()

        const signatureImage = userProfile.data?.signature_image

        if (signatureImage) {
          const newSignature = {
            signature_image: signatureImage,
            signed_at: new Date().toISOString(),
          }

          if (signatureType === "prepared_by") {
            setPreparedBySignature(newSignature)
          } else {
            setApprovedBySignature(newSignature)
          }
        }

        toast.success({
          title: "Signature Added",
          description: "Your signature has been added to this invoice.",
        })
      }
    } catch (error) {
      toast.error({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle signature.",
      })
    } finally {
      setIsTogglingSignature(false)
    }
  }

  const handleSendToClient = async () => {
    try {
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
    } catch {
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
      <div className="flex items-center justify-between print:hidden">
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
          {invoice.status === "for_approval" &&
            currentUserId === invoice.approved_by &&
            preparedBySignature &&
            approvedBySignature && (
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

      {/* Invoice Document */}
      <div className="border rounded-lg overflow-hidden bg-white" id="invoice-print">
        {/* Section 1: Company Logo */}
        <div className="p-8 flex flex-col items-center justify-center">
          <div className="relative h-20 w-[180px]">
            <Image
              src={LOGO_URL}
              alt="Scholarly Consulting"
              fill
              className="object-contain"
              unoptimized
              loading="eager"
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">Alim St., Kidapawan City</p>
        </div>

        {/* Section 2: BILLING INVOICE Title */}
        <div className="px-8 py-4">
          <h1 className="text-2xl font-bold text-center text-gray-900 tracking-wide">BILLING INVOICE</h1>
        </div>

        {/* Section 3: Bill To and Invoice Number */}
        <div className="px-8 py-4">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">Bill To:</p>
              <p className="text-base text-gray-900">{client?.name || "-"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">Invoice Number:</p>
              <p className="text-base text-gray-900">{invoice.invoice_number}</p>
            </div>
          </div>
        </div>

        {/* Section 4: Line Items Table */}
        <div className="px-8 py-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-t border-b border-gray-400">
                <th className="text-left text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4 w-48">Date</th>
                <th className="text-left text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4">Description</th>
                <th className="text-right text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4 w-40">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => (
                <tr key={item.id} className={index !== lineItems.length - 1 ? "border-b border-gray-200" : ""}>
                  <td className="py-3 px-4 text-sm text-gray-900">{formatDate(invoice.date)}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{item.description}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 5: Totals */}
        <div className="px-8 py-4">
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-900 font-medium">Grand Total</span>
                <span className="text-gray-900">{formatCurrency(invoice.grand_total)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-900 font-medium">Discount</span>
                  <span className="text-gray-900">-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-gray-400 pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatCurrency(invoice.amount_due)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Mode of Payment */}
        {bankAccount && (
          <div className="px-8 py-4">
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Mode of Payment</p>
            <div className="space-y-1 text-sm text-gray-900">
              <p><span className="font-medium">Account Name:</span> {bankAccount.name}</p>
              <p><span className="font-medium">Bank Name:</span> {bankAccount.bank_name}</p>
              <p><span className="font-medium">Account Number:</span> {bankAccount.account_number}</p>
            </div>
          </div>
        )}

        {/* Section 7: Prepared By and Approved By */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-2 gap-8">
            <div className="relative group">
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Prepared by:</p>
              <div className="relative inline-block min-w-[200px]">
                <div className="relative h-16 -mb-8">
                  {preparedBySignature ? (
                    <Image
                      key={`prepared-${preparedBySignature.signed_at}`}
                      src={preparedBySignature.signature_image}
                      alt="Signature"
                      fill
                      className="object-contain z-10"
                      unoptimized
                      priority
                    />
                  ) : null}
                </div>
                <div>
                  <p className="text-sm text-gray-900 font-medium border-b border-gray-900 pb-1">
                    {preparedBy?.full_name || preparedBy?.email || "-"}
                  </p>
                  {preparedBy?.position && (
                    <p className="text-xs text-gray-600 pt-1">{preparedBy.position}</p>
                  )}
                </div>
                {/* Hover button for current user */}
                {currentUserId &&
                  currentUserId === invoice.prepared_by &&
                  invoice.status !== "approved" && (
                    <button
                      onClick={() => handleToggleSignature("prepared_by")}
                      disabled={isTogglingSignature}
                      className={`absolute -top-2 -right-2 p-1.5 rounded-full shadow-md transition-all duration-200 print:hidden opacity-0 group-hover:opacity-100 z-50 ${
                        preparedBySignature
                          ? "bg-red-100 text-red-600 hover:bg-red-200"
                          : "bg-green-100 text-green-600 hover:bg-green-200"
                      }`}
                      title={preparedBySignature ? "Remove signature" : "Add signature"}
                    >
                      {preparedBySignature ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Signature className="h-4 w-4" />
                      )}
                    </button>
                  )}
              </div>
            </div>
            <div className="relative group">
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Approved by:</p>
              <div className="relative inline-block min-w-[200px]">
                <div className="relative h-16 -mb-8">
                  {approvedBySignature ? (
                    <Image
                      key={`approved-${approvedBySignature.signed_at}`}
                      src={approvedBySignature.signature_image}
                      alt="Signature"
                      fill
                      className="object-contain z-10"
                      unoptimized
                      priority
                    />
                  ) : null}
                </div>
                <div>
                  <p className="text-sm text-gray-900 font-medium border-b border-gray-900 pb-1">
                    {approvedBy?.full_name || approvedBy?.email || "-"}
                  </p>
                  {approvedBy?.position && (
                    <p className="text-xs text-gray-600 pt-1">{approvedBy.position}</p>
                  )}
                </div>
                {/* Hover button for current user */}
                {currentUserId &&
                  currentUserId === invoice.approved_by &&
                  invoice.status !== "approved" && (
                  <button
                    onClick={() => handleToggleSignature("approved_by")}
                    disabled={isTogglingSignature}
                    className={`absolute -top-2 -right-2 p-1.5 rounded-full shadow-md transition-all duration-200 print:hidden opacity-0 group-hover:opacity-100 z-50 ${
                      approvedBySignature
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-green-100 text-green-600 hover:bg-green-200"
                    }`}
                    title={approvedBySignature ? "Remove signature" : "Add signature"}
                  >
                    {approvedBySignature ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Signature className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 8: Footer */}
        <div className="px-8 py-6 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span>0910-027-7571</span>
              <span className="text-gray-400">{'//'}</span>
              <span>0966-167-4592</span>
            </div>
            <div className="flex flex-col items-center">
              <span>scholarlyconsulting.co</span>
            </div>
            <div>
              <span>info@scholarlyconsulting.co</span>
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

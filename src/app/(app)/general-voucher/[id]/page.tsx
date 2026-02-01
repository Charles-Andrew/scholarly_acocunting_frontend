"use client"

import * as React from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Printer, Signature, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import type {
  GeneralVoucherJournalEntryCategory,
  GeneralVoucherLinkedInvoice,
  VoucherDetail,
} from "@/lib/types/general-voucher"
import type { BillingInvoiceUser } from "@/lib/types/invoice"

interface GeneralVoucherPageProps {
  params: Promise<{
    id: string
  }>
}

const LOGO_URL = "https://gjrdshqnjalyivzeciyu.supabase.co/storage/v1/object/public/company-logos/scholarly_logo.png"

export default function GeneralVoucherDetailPage({ params }: GeneralVoucherPageProps) {
  const resolvedParams = React.use(params)
  const supabase = createClient()
  const [voucher, setVoucher] = React.useState<VoucherDetail | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [users, setUsers] = React.useState<BillingInvoiceUser[]>([])
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [preparedBySignature, setPreparedBySignature] = React.useState<{ signature_image: string; signed_at: string } | null>(null)
  const [checkedBySignature, setCheckedBySignature] = React.useState<{ signature_image: string; signed_at: string } | null>(null)
  const [approvedBySignature, setApprovedBySignature] = React.useState<{ signature_image: string; signed_at: string } | null>(null)
  const [isTogglingSignature, setIsTogglingSignature] = React.useState(false)

  const fetchVoucherData = React.useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

      // Reset signatures
      setPreparedBySignature(null)
      setCheckedBySignature(null)
      setApprovedBySignature(null)

      // Fetch voucher
      const { data: voucherData, error: voucherError } = await supabase
        .from("general_vouchers")
        .select("*")
        .eq("id", resolvedParams.id)
        .single()

      if (voucherError) throw voucherError

      if (!voucherData) {
        setVoucher(null)
        setIsLoading(false)
        return
      }

      // Fetch recipient separately from user_profiles
      let recipient: VoucherDetail['recipient'] = null
      if (voucherData.recipient_id) {
        const { data: recipientData } = await supabase
          .from("user_profiles")
          .select("id, full_name, email, position, signature_image")
          .eq("id", voucherData.recipient_id)
          .single()

        if (recipientData) {
          recipient = recipientData
        }
      }

      // Fetch associated journal entry category
      const { data: junctionData, error: junctionError } = await supabase
        .from("general_voucher_journal_entries")
        .select("journal_entry_category_id")
        .eq("general_voucher_id", resolvedParams.id)
        .single()

      if (junctionError && junctionError.code !== "PGRST116") throw junctionError

      let category: GeneralVoucherJournalEntryCategory | null = null
      let linkedInvoices: GeneralVoucherLinkedInvoice[] = []

      if (junctionData?.journal_entry_category_id) {
        // Fetch category details
        const { data: categoryData, error: categoryError } = await supabase
          .from("journal_entry_categories")
          .select("id, category_name, reference, remarks")
          .eq("id", junctionData.journal_entry_category_id)
          .single()

        if (categoryError) throw categoryError
        category = categoryData

        // Fetch linked invoices filtered by category ID
        const { data: linkedData, error: linkedError } = await supabase
          .from("account_titles_billing_invoices")
          .select(`
            id,
            billing_invoice_id,
            billing_invoices!inner(
              invoice_number,
              grand_total,
              clients!inner(name, accounts_receivable_code)
            )
          `)
          .eq("journal_entry_category_id", junctionData.journal_entry_category_id)

        if (linkedError) throw linkedError

        linkedInvoices = (linkedData || []).map((link: unknown) => {
          const linkData = link as {
            id: string
            billing_invoice_id: string
            billing_invoices: {
              invoice_number: string
              grand_total: number
              clients: {
                name: string
                accounts_receivable_code: string
              }
            }
          }
          return {
            id: linkData.id,
            billing_invoice_id: linkData.billing_invoice_id,
            invoice_number: linkData.billing_invoices.invoice_number,
            client_name: linkData.billing_invoices.clients.name,
            grand_total: Number(linkData.billing_invoices.grand_total),
            ar_code: linkData.billing_invoices.clients.accounts_receivable_code || "",
          }
        })
      }

      // Fetch users for signatures
      const { data: usersData } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, position")

      if (usersData) {
        const formattedUsers = usersData.map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name || u.email?.split("@")[0] || u.email,
          position: u.position,
        }))
        setUsers(formattedUsers)

        // Fetch signatures from general_voucher_signatures table
        const { data: signatures } = await supabase
          .from("general_voucher_signatures")
          .select("signature_type, signature_image, signed_at")
          .eq("general_voucher_id", resolvedParams.id)

        if (signatures) {
          signatures.forEach((sig) => {
            if (sig.signature_type === "prepared_by") {
              setPreparedBySignature({
                signature_image: sig.signature_image,
                signed_at: sig.signed_at,
              })
            } else if (sig.signature_type === "checked_by") {
              setCheckedBySignature({
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

      setVoucher({
        ...voucherData,
        recipient,
        journal_entry_categories: category,
        linked_invoices: linkedInvoices,
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to load general voucher data.",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, resolvedParams.id])

  React.useEffect(() => {
    fetchVoucherData()
  }, [fetchVoucherData])

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

  const handlePrint = () => {
    window.print()
  }

  const handleToggleSignature = async (signatureType: "prepared_by" | "checked_by" | "approved_by") => {
    const hasSignature =
      signatureType === "prepared_by" ? preparedBySignature :
      signatureType === "checked_by" ? checkedBySignature :
      approvedBySignature

    setIsTogglingSignature(true)
    try {
      if (hasSignature) {
        // Remove signature
        const response = await fetch(`/api/general-vouchers/${resolvedParams.id}/signature`, {
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
        } else if (signatureType === "checked_by") {
          setCheckedBySignature(null)
        } else {
          setApprovedBySignature(null)
        }

        toast({
          title: "Signature Removed",
          description: "Your signature has been removed from this voucher.",
        })
      } else {
        // Add signature
        const response = await fetch(`/api/general-vouchers/${resolvedParams.id}/signature`, {
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
          } else if (signatureType === "checked_by") {
            setCheckedBySignature(newSignature)
          } else {
            setApprovedBySignature(newSignature)
          }
        }

        toast({
          title: "Signature Added",
          description: "Your signature has been added to this voucher.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle signature.",
        variant: "error",
      })
    } finally {
      setIsTogglingSignature(false)
    }
  }

  // Calculate preview entries for journal display
  const previewEntries = React.useMemo(() => {
    if (!voucher?.linked_invoices.length) return []

    const entries: {
      account_title: string
      debit: number | null
      credit: number | null
      source: string
    }[] = []

    // Debit entries from invoices
    voucher.linked_invoices.forEach((inv) => {
      entries.push({
        account_title: inv.ar_code || "Accounts Receivable",
        debit: inv.grand_total,
        credit: null,
        source: inv.invoice_number,
      })
    })

    // Credit entry from category
    if (voucher.journal_entry_categories) {
      entries.push({
        account_title: voucher.journal_entry_categories.category_name,
        debit: null,
        credit: voucher.amount,
        source: "Revenue Credit",
      })
    }

    return entries
  }, [voucher])

  // Calculate totals
  const totals = React.useMemo(() => {
    if (!previewEntries.length) return { debit: 0, credit: 0 }
    const debit = previewEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0)
    const credit = previewEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0)
    return { debit, credit }
  }, [previewEntries])

  const preparedBy = users.find((u) => u.id === voucher?.prepared_by)
  const checkedBy = users.find((u) => u.id === voucher?.checked_by)
  const approvedBy = users.find((u) => u.id === voucher?.approved_by)

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/general-voucher">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Loading...</h1>
        </div>
      </div>
    )
  }

  if (!voucher) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/general-voucher">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Voucher Not Found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/general-voucher">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">General Voucher</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button asChild>
            <Link href={`/general-voucher/${voucher.id}/edit`}>
              Edit Voucher
            </Link>
          </Button>
        </div>
      </div>

      {/* Voucher Document */}
      <div className="border rounded-lg overflow-hidden bg-white" id="voucher-print">
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

        {/* Section 2: GENERAL VOUCHER Title */}
        <div className="px-8 py-4">
          <h1 className="text-2xl font-bold text-center text-gray-900 tracking-wide">GENERAL VOUCHER</h1>
        </div>

        {/* Section 3: Pay To and Voucher Info */}
        <div className="px-8 py-4">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">To:</p>
              <p className="text-base text-gray-900">{voucher.recipient?.full_name || voucher.recipient?.email || "N/A"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">GV #:</p>
              <p className="text-base text-gray-900">{voucher.gv_id || "-"}</p>
            </div>
          </div>
        </div>

        {/* Section 4: Particulars Table */}
        <div className="px-8 py-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-t border-b border-gray-400">
                <th className="text-left text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4 w-40">Date</th>
                <th className="text-left text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4">Particulars</th>
                <th className="text-left text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4 w-40">References</th>
                <th className="text-right text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4 w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 px-4 text-sm text-gray-900">{formatDate(voucher.date)}</td>
                <td className="py-3 px-4 text-sm text-gray-900 whitespace-pre-wrap">{voucher.particulars}</td>
                <td className="py-3 px-4 text-sm text-gray-900">{voucher.reference || "-"}</td>
                <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatCurrency(voucher.amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 5: Journal Entries */}
        {previewEntries.length > 0 && (
          <div className="px-8 py-4">
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Journal Entries</p>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-t border-b border-gray-400">
                  <th className="text-left text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4">Account Titles</th>
                  <th className="text-right text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4 w-32">Debit</th>
                  <th className="text-right text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4 w-32">Credit</th>
                </tr>
              </thead>
              <tbody>
                {previewEntries.map((entry, index) => (
                  <tr key={index} className={index !== previewEntries.length - 1 ? "border-b border-gray-200" : ""}>
                    <td className={`py-3 px-4 text-sm text-gray-900 ${!entry.debit ? "pl-8" : ""}`}>
                      {entry.account_title}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right">
                      {entry.debit ? formatCurrency(entry.debit) : "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right">
                      {entry.credit ? formatCurrency(entry.credit) : "-"}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-900">
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900">TOTAL</td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(totals.debit)}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(totals.credit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Section 6: Prepared By, Checked By, and Approved By */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-3 gap-8">
            {/* Prepared By */}
            <div className="relative group">
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Prepared by:</p>
              <div className="relative inline-block min-w-[200px]">
                <div className="relative h-16 -mb-8">
                  {preparedBySignature && (
                    <Image
                      src={preparedBySignature.signature_image}
                      alt="Signature"
                      fill
                      className="object-contain z-10"
                      unoptimized
                    />
                  )}
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
                {currentUserId && currentUserId === voucher?.prepared_by && (
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

            {/* Checked By */}
            <div className="relative group">
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Checked by:</p>
              <div className="relative inline-block min-w-[200px]">
                <div className="relative h-16 -mb-8">
                  {checkedBySignature && (
                    <Image
                      src={checkedBySignature.signature_image}
                      alt="Signature"
                      fill
                      className="object-contain z-10"
                      unoptimized
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-900 font-medium border-b border-gray-900 pb-1">
                    {checkedBy?.full_name || checkedBy?.email || "-"}
                  </p>
                  {checkedBy?.position && (
                    <p className="text-xs text-gray-600 pt-1">{checkedBy.position}</p>
                  )}
                </div>
                {/* Hover button for current user */}
                {currentUserId && currentUserId === voucher?.checked_by && (
                  <button
                    onClick={() => handleToggleSignature("checked_by")}
                    disabled={isTogglingSignature}
                    className={`absolute -top-2 -right-2 p-1.5 rounded-full shadow-md transition-all duration-200 print:hidden opacity-0 group-hover:opacity-100 z-50 ${
                      checkedBySignature
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-green-100 text-green-600 hover:bg-green-200"
                    }`}
                    title={checkedBySignature ? "Remove signature" : "Add signature"}
                  >
                    {checkedBySignature ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Signature className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Approved By */}
            <div className="relative group">
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Approved by:</p>
              <div className="relative inline-block min-w-[200px]">
                <div className="relative h-16 -mb-8">
                  {approvedBySignature && (
                    <Image
                      src={approvedBySignature.signature_image}
                      alt="Signature"
                      fill
                      className="object-contain z-10"
                      unoptimized
                    />
                  )}
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
                {currentUserId && currentUserId === voucher?.approved_by && (
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

        {/* Section 7: Footer */}
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
          #voucher-print, #voucher-print * {
            visibility: visible;
          }
          #voucher-print {
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

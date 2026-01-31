"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "@/hooks/use-toast"
import type { Invoice, LineItem, BillingInvoiceUser } from "@/lib/types/invoice"
import type { Client, IncomeCategory } from "@/lib/types"
import type { BankAccount } from "@/lib/types/bank-account"

interface BillingInvoiceFormProps {
  invoiceId?: string
}

export function BillingInvoiceForm({ invoiceId }: BillingInvoiceFormProps) {
  const supabase = createClient()
  const isEditMode = !!invoiceId

  const [clients, setClients] = useState<Client[]>([])
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [users, setUsers] = useState<BillingInvoiceUser[]>([])
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", amount: 0 },
  ])
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSaving, setIsSaving] = useState(false)

  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [selectedIncomeCategoryId, setSelectedIncomeCategoryId] = useState<string>("")
  const [date, setDate] = useState<string>("")
  const [discount, setDiscount] = useState<number>(0)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("")
  const [preparedById, setPreparedById] = useState<string>("")
  const [approvedById, setApprovedById] = useState<string>("")

  const fetchData = useCallback(async () => {
    const [clientsData, categoriesData, bankData, usersData] = await Promise.all([
      supabase.from("clients").select("id, name, accounts_receivable_code, created_at, updated_at").order("name"),
      supabase.from("income_categories").select("id, name, slug, created_at, updated_at").order("name"),
      supabase.from("bank_accounts").select("id, name, bank_name, account_number, created_at, updated_at"),
      supabase.from("user_profiles").select("id, email, full_name"),
    ])

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
    }
  }, [supabase])

  const fetchInvoiceData = useCallback(async () => {
    if (!invoiceId) return

    setIsLoading(true)
    try {
      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("billing_invoices")
        .select("*")
        .eq("id", invoiceId)
        .single()

      if (invoiceError) throw invoiceError

      // Fetch line items
      const { data: itemsData, error: itemsError } = await supabase
        .from("billing_invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)

      if (itemsError) throw itemsError

      setInvoice(invoiceData)
      setSelectedClientId(invoiceData.client_id || "")
      setSelectedIncomeCategoryId(invoiceData.income_category_id || "")
      setDate(invoiceData.date || "")
      setDiscount(invoiceData.discount || 0)
      setSelectedBankAccountId(invoiceData.bank_account_id || "")
      setPreparedById(invoiceData.prepared_by || "")
      setApprovedById(invoiceData.approved_by || "")

      if (itemsData && itemsData.length > 0) {
        setLineItems(
          itemsData.map((item) => ({
            id: item.id,
            description: item.description,
            amount: item.amount,
          }))
        )
      } else {
        setLineItems([{ id: crypto.randomUUID(), description: "", amount: 0 }])
      }
    } catch {
      toast.error({
        title: "Error",
        description: "Failed to load invoice data.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, invoiceId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (isEditMode) {
      fetchInvoiceData()
    }
  }, [isEditMode, fetchInvoiceData])

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  const addLineItem = () => {
    setLineItems([...lineItems, { id: crypto.randomUUID(), description: "", amount: 0 }])
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id))
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  const grandTotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  const amountDue = grandTotal - (discount || 0)

  const formatCurrency = (value: number) => {
    return `₱${value.toFixed(2)}`
  }

  // Check if there are unsaved changes
  const hasUnsavedChanges =
    selectedClientId ||
    selectedIncomeCategoryId ||
    date ||
    selectedBankAccountId ||
    preparedById ||
    approvedById ||
    lineItems.some((item) => item.description.trim() !== "" || item.amount > 0)

  // Check if invoice has content to save as draft
  const canSaveDraft = hasUnsavedChanges

  // Check if invoice is ready to submit for approval (all required fields)
  const canFinalize =
    selectedClientId &&
    selectedIncomeCategoryId &&
    date &&
    selectedBankAccountId &&
    preparedById &&
    approvedById &&
    lineItems.some((item) => item.description.trim() !== "" && item.amount > 0)

  const generateInvoiceNumber = async () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const { count } = await supabase
      .from("billing_invoices")
      .select("*", { count: "exact", head: true })
      .like("invoice_number", `INV-${dateStr}%`)

    const sequence = String((count || 0) + 1).padStart(3, "0")
    return `INV-${dateStr}-${sequence}`
  }

  const saveInvoice = async (status: "draft" | "for_approval") => {
    if (!selectedClientId || !selectedIncomeCategoryId || !date) {
      toast.error({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
      })
      return
    }

    setIsSaving(true)
    try {
      if (isEditMode && invoice) {
        // UPDATE existing invoice
        const { error: invoiceError } = await supabase
          .from("billing_invoices")
          .update({
            client_id: selectedClientId,
            income_category_id: selectedIncomeCategoryId,
            date: date,
            status: status,
            grand_total: grandTotal,
            discount: discount || 0,
            amount_due: amountDue,
            bank_account_id: selectedBankAccountId || null,
            prepared_by: preparedById || null,
            approved_by: approvedById || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId)

        if (invoiceError) throw invoiceError

        // Delete existing line items and insert new ones
        await supabase.from("billing_invoice_items").delete().eq("invoice_id", invoiceId)

        const lineItemsData = lineItems
          .filter((item) => item.description.trim() !== "")
          .map((item) => ({
            invoice_id: invoiceId,
            description: item.description,
            amount: item.amount,
          }))

        if (lineItemsData.length > 0) {
          const { error: itemsError } = await supabase
            .from("billing_invoice_items")
            .insert(lineItemsData)

          if (itemsError) throw itemsError
        }

        toast.success({
          title: "Invoice Updated",
          description: `Invoice ${invoice.invoice_number} has been updated.`,
        })
      } else {
        // CREATE new invoice
        const invoiceNumber = await generateInvoiceNumber()

        const { data: newInvoice, error: invoiceError } = await supabase
          .from("billing_invoices")
          .insert({
            invoice_number: invoiceNumber,
            client_id: selectedClientId,
            income_category_id: selectedIncomeCategoryId,
            date: date,
            status: status,
            grand_total: grandTotal,
            discount: discount || 0,
            amount_due: amountDue,
            bank_account_id: selectedBankAccountId || null,
            prepared_by: preparedById || null,
            approved_by: approvedById || null,
          })
          .select()
          .single()

        if (invoiceError) throw invoiceError

        const lineItemsData = lineItems
          .filter((item) => item.description.trim() !== "")
          .map((item) => ({
            invoice_id: newInvoice.id,
            description: item.description,
            amount: item.amount,
          }))

        if (lineItemsData.length > 0) {
          const { error: itemsError } = await supabase
            .from("billing_invoice_items")
            .insert(lineItemsData)

          if (itemsError) throw itemsError
        }

        toast.success({
          title: "Invoice Created",
          description: `Invoice ${invoiceNumber} has been created.`,
        })
      }

      window.location.href = "/billing-invoice"
    } catch {
      toast.error({
        title: "Error",
        description: "Failed to save invoice. Please try again.",
      })
    } finally {
      setIsSaving(false)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/billing-invoice">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditMode ? "Edit Billing Invoice" : "Create Billing Invoice"}
        </h1>
        {isEditMode && invoice && (
          <span className="text-muted-foreground text-lg font-normal">
            - {invoice.invoice_number}
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Client Selection */}
          <div className="grid gap-2">
            <Label htmlFor="client">Client</Label>
            <Select
              value={selectedClientId}
              onValueChange={(value) => {
                setSelectedClientId(value)
                setSelectedIncomeCategoryId("")
                setDate("")
              }}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClient && selectedClient.accounts_receivable_code && (
              <p className="text-sm text-muted-foreground">
                A/R Code: {selectedClient.accounts_receivable_code}
              </p>
            )}
          </div>

          {/* Step 2: Income Category Selection */}
          {selectedClientId && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="income-category">Income Category</Label>
              <Select
                value={selectedIncomeCategoryId}
                onValueChange={(value) => {
                  setSelectedIncomeCategoryId(value)
                  setDate("")
                }}
              >
                <SelectTrigger id="income-category">
                  <SelectValue placeholder="Select an income category" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 3: Date Selection */}
          {selectedIncomeCategoryId && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          )}

          {/* Step 4: Line Items */}
          {date && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60%]">Description</TableHead>
                      <TableHead className="w-[30%]">Amount</TableHead>
                      <TableHead className="w-[10%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            placeholder="Enter description"
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(item.id, "description", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.amount || ""}
                            onChange={(e) =>
                              updateLineItem(
                                item.id,
                                "amount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(item.id)}
                            disabled={lineItems.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex flex-col items-end gap-2">
                <div className="text-lg font-medium">
                  Grand Total: {formatCurrency(grandTotal)}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="discount" className="text-sm">
                    Discount:
                  </Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-32"
                    value={discount || ""}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="text-lg font-bold">
                  Amount Due: {formatCurrency(amountDue)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mode of Payments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Mode of Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="bank-account">Bank Account</Label>
            <Select
              value={selectedBankAccountId}
              onValueChange={setSelectedBankAccountId}
            >
              <SelectTrigger id="bank-account">
                <SelectValue placeholder="Select a bank account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} - {account.bank_name} ({account.account_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Signatures Section */}
      <Card>
        <CardHeader>
          <CardTitle>Signatures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="prepared-by">Prepared By</Label>
              <Select
                value={preparedById}
                onValueChange={setPreparedById}
              >
                <SelectTrigger id="prepared-by">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="approved-by">Approved By</Label>
              <Select
                value={approvedById}
                onValueChange={setApprovedById}
              >
                <SelectTrigger id="approved-by">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        {hasUnsavedChanges && !isEditMode ? (
          <ConfirmDialog
            trigger={
              <Button variant="outline" disabled={isSaving}>
                Cancel
              </Button>
            }
            title="Discard Changes?"
            description="You have unsaved changes. If you cancel now, all current values will be deleted and won't be saved."
            confirmText="Discard"
            onConfirm={() => {
              window.location.href = "/billing-invoice"
            }}
            destructive
          />
        ) : (
          <Button variant="outline" asChild disabled={isSaving}>
            <Link href="/billing-invoice">Cancel</Link>
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => saveInvoice("draft")}
          disabled={isSaving || !canSaveDraft}
          title={!canSaveDraft ? "Fill in at least one field to save as draft" : ""}
        >
          {isSaving ? "Saving..." : "Save as Draft"}
        </Button>
        <Button
          onClick={() => saveInvoice("for_approval")}
          disabled={isSaving || !canFinalize}
          title={!canFinalize ? "Fill in all required fields to submit" : ""}
        >
          {isSaving ? "Saving..." : "Submit for Approval"}
        </Button>
      </div>
    </div>
  )
}

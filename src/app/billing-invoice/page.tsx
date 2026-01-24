"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Eye, Pencil, Printer, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import type { Invoice } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Plus } from "lucide-react"

export default function BillingInvoicePage() {
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [loading, setLoading] = React.useState(true)
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const supabase = createClient()

  const fetchInvoices = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("billing_invoices")
        .select(`
          *,
          clients:client_id (name),
          income_categories:income_category_id (name),
          prepared_by_user:prepared_by (email, full_name)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase error:", error)
        toast.error({
          title: "Error",
          description: "Failed to load invoices.",
        })
        return
      }

      // Transform the data to include joined fields
      const formattedData: Invoice[] = (data || []).map((invoice: Record<string, unknown>) => ({
        ...invoice,
        client_name: (invoice.clients as Record<string, unknown>)?.name as string || "",
        income_category_name: (invoice.income_categories as Record<string, unknown>)?.name as string || "",
        prepared_by_name: ((invoice.prepared_by_user as Record<string, unknown>)?.email as string)?.split("@")[0] || "",
      })) as Invoice[]

      setInvoices(formattedData)
    } catch (error) {
      console.error("Error fetching invoices:", error)
      toast.error({
        title: "Error",
        description: "An unexpected error occurred.",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase.from("billing_invoices").delete().eq("id", invoiceId)

      if (error) {
        if (error.code === "23503") {
          toast.error({
            title: "Cannot Delete",
            description: "This invoice has related records and cannot be deleted.",
          })
        } else {
          toast.error({
            title: "Error",
            description: "Failed to delete invoice. Please try again.",
          })
        }
        return
      }

      toast.success({
        title: "Invoice Deleted",
        description: "The invoice has been successfully deleted.",
      })
      fetchInvoices()
    } catch (error) {
      console.error("Error deleting invoice:", error)
      toast.error({
        title: "Error",
        description: "An unexpected error occurred.",
      })
    }
  }

  React.useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      finalized: "default",
      paid: "outline",
      cancelled: "destructive",
    }
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>
  }

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "invoice_number",
      header: "Invoice #",
      cell: ({ row }) => <span className="font-medium">{row.getValue("invoice_number")}</span>,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.getValue("date")),
    },
    {
      accessorKey: "client_name",
      header: "Client",
      cell: ({ row }) => row.getValue("client_name") || "-",
    },
    {
      accessorKey: "income_category_name",
      header: "Category",
      cell: ({ row }) => row.getValue("income_category_name") || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return getStatusBadge(status.charAt(0).toUpperCase() + status.slice(1))
      },
    },
    {
      accessorKey: "prepared_by_name",
      header: "Prepared By",
      cell: ({ row }) => {
        const name = row.getValue("prepared_by_name") as string
        return name ? name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "-"
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const invoice = row.original
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/billing-invoice/${invoice.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/billing-invoice/${invoice.id}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                toast.info({
                  title: "Print",
                  description: `Print invoice ${invoice.invoice_number}`,
                })
              }}
            >
              <Printer className="h-4 w-4" />
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              }
              title="Delete Invoice"
              description="Are you sure you want to delete this invoice? This action cannot be undone."
              confirmText="Delete"
              onConfirm={() => handleDeleteInvoice(invoice.id)}
              destructive
            />
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      globalFilter,
      pagination,
    },
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Billing Invoice</h1>
        <Button asChild>
          <Link href="/billing-invoice/create">
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search invoices..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {table.getRowModel().rows.length} of {invoices.length} invoices
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

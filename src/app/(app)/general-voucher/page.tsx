"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Trash2, Plus, Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import Link from "next/link"
import type { GeneralVoucher } from "@/lib/types/general-voucher"

export default function GeneralVoucherPage() {
  const [vouchers, setVouchers] = React.useState<GeneralVoucher[]>([])
  const [loading, setLoading] = React.useState(true)

  const supabase = createClient()

  const fetchVouchers = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("general_vouchers")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setVouchers(data || [])
    } catch {
      toast({
        title: "Error",
        description: "Failed to load general vouchers.",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const handleDeleteVoucher = async (voucherId: string) => {
    try {
      // First delete related records from general_voucher_journal_entries
      const { error: linkError } = await supabase
        .from("general_voucher_journal_entries")
        .delete()
        .eq("general_voucher_id", voucherId)

      if (linkError) throw linkError

      // Then delete the general voucher
      const { error } = await supabase
        .from("general_vouchers")
        .delete()
        .eq("id", voucherId)

      if (error) throw error

      toast({
        title: "Success",
        description: "General voucher deleted successfully.",
      })
      fetchVouchers()
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete general voucher.",
        variant: "error",
      })
    }
  }

  React.useEffect(() => {
    fetchVouchers()
  }, [fetchVouchers])

  const columns: ColumnDef<GeneralVoucher>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const dateValue = row.getValue("date") as string
        if (!dateValue) return ""
        const date = new Date(dateValue)
        return date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      },
    },
    {
      accessorKey: "particulars",
      header: "Particulars",
    },
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => {
        const reference = row.getValue("reference") as string | null
        return reference || "-"
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = row.getValue("amount") as number
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "PHP",
        }).format(amount)
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/general-voucher/${row.original.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
            title="Delete General Voucher"
            description="Are you sure you want to delete this general voucher? This action cannot be undone."
            confirmText="Delete"
            onConfirm={() => handleDeleteVoucher(row.original.id)}
            destructive
          />
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: vouchers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">General Vouchers</h1>
        <Button asChild>
          <Link href="/general-voucher/create">
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-auto">
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
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
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
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No general vouchers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

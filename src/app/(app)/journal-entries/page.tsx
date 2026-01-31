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

export default function JournalEntriesPage() {
  const [entries, setEntries] = React.useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = React.useState(true)

  const supabase = createClient()

  const fetchEntries = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch {
      toast.error({ title: "Error", description: "Failed to load." })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const handleDeleteEntry = async (entryId: string) => {
    try {
      // First delete related records from account_titles_billing_invoices
      const { error: linkError } = await supabase
        .from("account_titles_billing_invoices")
        .delete()
        .eq("journal_entry_id", entryId)

      if (linkError) throw linkError

      // Then delete the journal entry
      const { error } = await supabase.from("journal_entries").delete().eq("id", entryId)
      if (error) throw error

      toast.success({ title: "Deleted" })
      fetchEntries()
    } catch {
      toast.error({ title: "Error", description: "Failed to delete." })
    }
  }

  React.useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const columns: ColumnDef<Record<string, unknown>>[] = [
    { accessorKey: "id", header: "ID" },
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
          year: "numeric"
        })
      }
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            asChild
          >
            <Link href={`/journal-entries/${row.original.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <ConfirmDialog
            trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            title="Delete"
            description="Are you sure?"
            confirmText="Delete"
            onConfirm={() => handleDeleteEntry(row.original.id as string)}
            destructive
          />
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Journal Entries</h1>
        <Button asChild>
          <Link href="/journal-entries/generate">
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
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">No entries.</TableCell>
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

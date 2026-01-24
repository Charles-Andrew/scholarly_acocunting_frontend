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
import { ChevronLeft, ChevronRight } from "lucide-react"
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
import { AddClientModal } from "@/components/clients/add-client-modal"
import { EditClientModal } from "@/components/clients/edit-client-modal"
import type { Client } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Pencil, Trash2 } from "lucide-react"

export default function ClientsPage() {
  const [clients, setClients] = React.useState<Client[]>([])
  const [loading, setLoading] = React.useState(true)
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const supabase = createClient()

  const fetchClients = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name", { ascending: true })

      if (error) {
        toast.error({
          title: "Error",
          description: "Failed to load clients.",
        })
        return
      }

      setClients(data || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
      toast.error({
        title: "Error",
        description: "An unexpected error occurred.",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const handleDeleteClient = async (clientId: string) => {
    try {
      const { error } = await supabase.from("clients").delete().eq("id", clientId)

      if (error) {
        if (error.code === "23503") {
          toast.error({
            title: "Cannot Delete",
            description: "This client has related records (invoices, transactions, etc.).",
          })
        } else {
          toast.error({
            title: "Error",
            description: "Failed to delete client. Please try again.",
          })
        }
        return
      }

      toast.success({
        title: "Client Deleted",
        description: "The client has been successfully deleted.",
      })
      fetchClients()
    } catch (error) {
      console.error("Error deleting client:", error)
      toast.error({
        title: "Error",
        description: "An unexpected error occurred.",
      })
    }
  }

  React.useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "accounts_receivable_code",
      header: "AR Code",
      cell: ({ row }) => row.getValue("accounts_receivable_code") || "-",
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return date.toLocaleDateString()
      },
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => {
        const date = new Date(row.getValue("updated_at"))
        return date.toLocaleDateString()
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const client = row.original
        return (
          <div className="flex items-center gap-2">
            <EditClientModal client={client} onClientUpdated={fetchClients}>
              <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>
            </EditClientModal>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              }
              title="Delete Client"
              description="Are you sure you want to delete this client? This action cannot be undone."
              confirmText="Delete"
              onConfirm={() => handleDeleteClient(client.id)}
              destructive
            />
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: clients,
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
        <h1 className="text-3xl font-bold">Clients</h1>
        <AddClientModal onClientAdded={fetchClients} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search clients..."
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
                      No clients found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {table.getRowModel().rows.length} of {clients.length} clients
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

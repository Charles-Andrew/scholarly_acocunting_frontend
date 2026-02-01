import { createClient } from "@/lib/supabase/server"
import { AddClientModal } from "@/components/clients/add-client-modal"
import ClientTable from "./client-table"
import type { Client } from "@/lib/types"

export default async function ClientsPage() {
  const supabase = await createClient()

  // Fetch data on the server (RLS filters out soft-deleted records)
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true })

  if (error) {
    throw new Error("Failed to fetch clients: " + error.message)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
        <AddClientModal />
      </div>

      <ClientTable initialData={(clients as Client[]) || []} />
    </div>
  )
}

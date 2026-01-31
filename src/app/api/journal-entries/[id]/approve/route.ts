import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch the journal entry
  const { data: journalEntry, error: fetchError } = await supabase
    .from("journal_entries")
    .select("approved_by, status")
    .eq("id", resolvedParams.id)
    .single()

  if (fetchError || !journalEntry) {
    return NextResponse.json({ error: "Journal entry not found" }, { status: 404 })
  }

  // Check authorization: only the assigned approver can approve
  if (journalEntry.approved_by !== user.id) {
    return NextResponse.json(
      { error: "You are not authorized to approve this journal entry" },
      { status: 403 }
    )
  }

  // Check status: only journal entries with "for_approval" status can be approved
  if (journalEntry.status !== "for_approval") {
    return NextResponse.json(
      { error: "Journal entry is not pending approval" },
      { status: 400 }
    )
  }

  // Approve the journal entry
  const { error: updateError } = await supabase
    .from("journal_entries")
    .update({
      status: "approved",
    })
    .eq("id", resolvedParams.id)

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to approve journal entry" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, message: "Journal entry approved successfully" })
}

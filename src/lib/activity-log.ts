import { createClient } from "@/lib/supabase/server"

export type LogAction = {
  action: string
  description: string
  resource_type?: string
  resource_id?: string
  metadata?: Record<string, unknown>
}

export async function logActivity({
  action,
  description,
  resource_type,
  resource_id,
  metadata = {},
}: LogAction) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error("Failed to get user for activity log:", userError?.message)
    return
  }

  // Get user metadata for name
  const userName =
    user.user_metadata?.full_name ||
    user.email ||
    `User ${user.id.slice(0, 8)}`

  // Get request info for IP and user agent (if available)
  const headers = await getHeaders()
  const ipAddress = headers.get("x-forwarded-for") || headers.get("x-real-ip") || null
  const userAgent = headers.get("user-agent") || null

  const { error } = await supabase.from("activity_logs").insert({
    user_id: user.id,
    user_name: userName,
    action,
    description,
    resource_type: resource_type || null,
    resource_id: resource_id || null,
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata,
  })

  if (error) {
    console.error("Failed to insert activity log:", error.message)
  }
}

// Helper to get headers in a server-safe way
async function getHeaders(): Promise<Headers> {
  // In Next.js, we can import headers from next/headers
  // This function handles both server components and API routes
  try {
    const { headers } = await import("next/headers")
    const headersList = await headers()
    return headersList
  } catch {
    // Fallback for cases where headers() isn't available
    return new Headers()
  }
}

// Convenience logging functions for common actions
export async function logCreate({
  resource_type,
  resource_id,
  description,
  metadata,
}: {
  resource_type: string
  resource_id: string
  description: string
  metadata?: Record<string, unknown>
}) {
  return logActivity({
    action: `create_${resource_type}`,
    description,
    resource_type,
    resource_id,
    metadata,
  })
}

export async function logUpdate({
  resource_type,
  resource_id,
  description,
  metadata,
}: {
  resource_type: string
  resource_id: string
  description: string
  metadata?: Record<string, unknown>
}) {
  return logActivity({
    action: `update_${resource_type}`,
    description,
    resource_type,
    resource_id,
    metadata,
  })
}

export async function logDelete({
  resource_type,
  resource_id,
  description,
}: {
  resource_type: string
  resource_id: string
  description: string
}) {
  return logActivity({
    action: `delete_${resource_type}`,
    description,
    resource_type,
    resource_id,
  })
}

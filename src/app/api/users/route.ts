import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Get current user to verify authorization
    const supabase = await createClient()
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { email, full_name, position } = body

    if (!email || !full_name) {
      return NextResponse.json(
        { error: "Email and full name are required" },
        { status: 400 }
      )
    }

    // Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Create the user in auth.users
    const { data: authData, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password: "password123", // Temporary password
        email_confirm: true,
        user_metadata: {
          full_name,
        },
      })

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      )
    }

    // Create the user profile using admin client (bypasses RLS)
    // Note: A database trigger also creates this, so we use upsert to avoid conflicts
    const { error: profileError } = await adminClient.from("user_profiles").upsert({
      id: authData.user.id,
      email,
      full_name,
      position: position || null,
    }, {
      onConflict: "id",
      ignoreDuplicates: false, // Update if exists (in case trigger already created it)
    })

    if (profileError) {
      // Try to delete the auth user since profile creation failed
      await adminClient.auth.admin.deleteUser(authData.user.id)
      console.error("Profile creation error:", profileError)
      return NextResponse.json(
        { error: "Failed to create user profile please recheck: " + profileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: authData.user,
    })
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    // Get current user to verify authorization
    const supabase = await createClient()
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { id, full_name, position, email } = body

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    if (!full_name || !email) {
      return NextResponse.json(
        { error: "Email and full name are required" },
        { status: 400 }
      )
    }

    // Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Update the user profile
    const { error: profileError } = await adminClient
      .from("user_profiles")
      .update({
        full_name,
        position: position || null,
        email,
      })
      .eq("id", id)

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 500 }
      )
    }

    // Update auth user metadata
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
      id,
      {
        email,
        user_metadata: {
          full_name,
        },
      }
    )

    if (authUpdateError) {
      return NextResponse.json(
        { error: "Failed to update auth user: " + authUpdateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
    })
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    // Get current user to verify authorization
    const supabase = await createClient()
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { id, is_active } = body

    if (!id || typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "User ID and is_active status are required" },
        { status: 400 }
      )
    }

    // Prevent disabling yourself
    if (id === currentUser.id && !is_active) {
      return NextResponse.json(
        { error: "You cannot disable your own account" },
        { status: 400 }
      )
    }

    // Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Update the user profile status
    const { error: profileError } = await adminClient
      .from("user_profiles")
      .update({
        is_active,
      })
      .eq("id", id)

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to update user status" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `User ${is_active ? "enabled" : "disabled"} successfully`,
    })
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    // Get current user to verify authorization
    const supabase = await createClient()
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Prevent deleting yourself
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      )
    }

    // Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Call the database function to handle user deletion with all cleanup
    const { error: deleteError } = await adminClient.rpc("delete_user", {
      target_user_id: id,
    })

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete user: " + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    })
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

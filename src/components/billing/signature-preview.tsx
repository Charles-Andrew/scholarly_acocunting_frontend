"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

interface SignaturePreviewProps {
  userId: string
  userName: string
  role: "Prepared By" | "Approved By"
}

export function SignaturePreview({ userId, userName, role }: SignaturePreviewProps) {
  const [signature, setSignature] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchSignature = async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("signature_image")
        .eq("id", userId)
        .single()
      setSignature(data?.signature_image || null)
    }
    fetchSignature()
  }, [supabase, userId])

  return (
    <div className="text-center">
      {signature ? (
        <Image src={signature} alt="Signature" width={200} height={80} className="max-h-20 mx-auto" unoptimized />
      ) : (
        <div className="h-20 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded">
          No signature set
        </div>
      )}
      <p className="text-sm mt-1">{userName}</p>
      <p className="text-xs text-muted-foreground">{role}</p>
    </div>
  )
}

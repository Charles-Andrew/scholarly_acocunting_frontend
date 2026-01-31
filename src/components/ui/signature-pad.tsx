"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface SignaturePadProps {
  userId: string
  initialSignature?: string | null
  onSignatureSaved?: () => void
  readOnly?: boolean
}

export function SignaturePad({
  userId,
  initialSignature,
  onSignatureSaved,
  readOnly = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(!!initialSignature)
  const [signature, setSignature] = useState<string | null>(initialSignature || null)
  const supabase = createClient()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // Set drawing style
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // If there's an existing signature, load it
    if (initialSignature) {
      const img = new Image()
      img.src = initialSignature
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }
    }
  }, [initialSignature])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number

    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return
    e.preventDefault()
    const { x, y } = getCoordinates(e)
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      setIsDrawing(true)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return
    e.preventDefault()
    const { x, y } = getCoordinates(e)
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      const canvas = canvasRef.current
      if (canvas) {
        const croppedSignature = cropSignature(canvas)
        setSignature(croppedSignature)
        setHasSignature(true)
      }
    }
  }

  // Crop whitespace from signature
  const cropSignature = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext("2d")
    if (!ctx) return canvas.toDataURL("image/png")

    const width = canvas.width
    const height = canvas.height
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0

    // Find bounding box of non-transparent pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3]
        if (alpha > 0) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    // If no signature drawn, return original
    if (minX === width || minY === height) {
      return canvas.toDataURL("image/png")
    }

    // Add padding
    const padding = 10
    minX = Math.max(0, minX - padding)
    minY = Math.max(0, minY - padding)
    maxX = Math.min(width, maxX + padding)
    maxY = Math.min(height, maxY + padding)

    const croppedWidth = maxX - minX
    const croppedHeight = maxY - minY

    // Create cropped canvas
    const croppedCanvas = document.createElement("canvas")
    croppedCanvas.width = croppedWidth
    croppedCanvas.height = croppedHeight
    const croppedCtx = croppedCanvas.getContext("2d")
    if (!croppedCtx) return canvas.toDataURL("image/png")

    // Draw cropped portion
    croppedCtx.drawImage(canvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight)

    return croppedCanvas.toDataURL("image/png")
  }

  const clearSignature = () => {
    if (readOnly) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setSignature(null)
      setHasSignature(false)
    }
  }

  const saveSignature = async () => {
    if (!signature) return

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ signature_image: signature })
        .eq("id", userId)

      if (error) throw error

      setHasSignature(true)
      onSignatureSaved?.()
    } catch {
      alert("Failed to save signature. Please try again.")
    }
  }

  const deleteSignature = async () => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ signature_image: null })
        .eq("id", userId)

      if (error) throw error

      clearSignature()
      onSignatureSaved?.()
    } catch {
      alert("Failed to delete signature. Please try again.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-md overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-40 touch-none cursor-crosshair"
          style={{ minHeight: "160px" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearSignature}>
            Clear
          </Button>
          <Button
            size="sm"
            onClick={saveSignature}
            disabled={!signature}
          >
            Save Signature
          </Button>
          {hasSignature && (
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSignature}
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

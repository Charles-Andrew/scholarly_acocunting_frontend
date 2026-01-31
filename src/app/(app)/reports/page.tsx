import { Construction } from "lucide-react"

export const dynamic = "force-dynamic"

export default function ReportsPage() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <Construction className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          This feature is coming soon. Stay tuned!
        </p>
      </div>
    </div>
  )
}

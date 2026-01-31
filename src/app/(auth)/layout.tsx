import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Auth - Scholarly Accounting",
  description: "Authentication pages",
}

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}

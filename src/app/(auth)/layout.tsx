import Logo from "@/components/shared/logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-off-white flex flex-col">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-duck-navy/5 via-duck-cyan/5 to-duck-yellow/5 pointer-events-none" />

      {/* Logo at top */}
      <div className="relative z-10 flex justify-center pt-8 pb-4">
        <Logo width={140} height={70} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-6 text-sm text-text-muted">
        <p>
          © {new Date().getFullYear()} Duck Entertainment. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  )
}

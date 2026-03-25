import { ProtectedRoute } from "@/components/shared/protected-route"

export default function SupplierOnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProtectedRoute allowedRoles={[1]}>{children}</ProtectedRoute>
}


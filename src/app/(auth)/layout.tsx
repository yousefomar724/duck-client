import Logo from "@/components/shared/logo"
import Image from "next/image"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-off-white flex flex-col relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero1.mp4" // Using hero video poster or fallback if video not supported in next/image, but for static bg image we should use an image asset.
          // Since we don't have a dedicated auth bg, let's use one of the landing images like resort.webp or offer.webp
          // resort.webp seems appropriate for a luxury feel.
          // Wait, video as background is nicer?
          // Let's use an image for better performance on auth pages.
          // 'resort.webp' is good.
          alt="Background"
          fill
          className="object-cover opacity-20 blur-sm"
          priority
        />
        {/* Overlay gradient to ensure text readability and match theme */}
        <div className="absolute inset-0 bg-linear-to-br from-duck-navy/90 via-duck-navy/80 to-duck-cyan/20" />
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-duck-cyan/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-duck-yellow/10 rounded-full blur-3xl" />
      </div>

      {/* Logo at top */}
      <div className="relative z-10 flex justify-center pt-12 pb-8">
        <Link
          href="/"
          className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-lg"
        >
          <Logo width={160} height={80} className="text-white" />
        </Link>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* We wrap children in a div that can have some shared styles if needed, 
              but the Cards inside pages will handle their own look. 
              We might want to make the Cards semi-transparent? 
              Let's update the pages to use a specific card style if possible, 
              or just wrap them here? 
              Actually, the pages use <Card>. We can override Card styles globally or pass className.
              But since we can't easily prop-drill into children pages without changing them,
              we will rely on the pages' Card implementation.
              However, to make them match the theme, we might want to edit the pages to use a transparent/glassmorphic card.
          */}
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-6 text-sm text-white/60">
        <p>
          © {new Date().getFullYear()} Duck Entertainment. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  )
}

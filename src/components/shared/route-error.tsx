"use client"

/* eslint-disable @next/next/no-html-link-for-pages -- Recovery needs a full document load, including when the client router or a chunk failed. */
import { useEffect, useSyncExternalStore } from "react"
import { SUPPORT_WHATSAPP_NUMBER } from "@/lib/support-contact"

const subscribe = () => () => {}

// Keep recovery independent of translation/auth providers: either may have failed.
export function RouteError({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const arabic = useSyncExternalStore(subscribe, () => document.documentElement.lang !== "en", () => true)
  useEffect(() => {
    console.error("Page failed to render", error)
  }, [error])

  const actionStyle = {
    display: "inline-block", padding: "12px 20px", borderRadius: 12,
    border: "1px solid #121528", cursor: "pointer", font: "inherit",
    textDecoration: "none", color: "#121528", background: "white",
  }

  return (
    <main dir={arabic ? "rtl" : "ltr"} style={{ minHeight: "70vh", padding: "140px 24px 60px", background: "#f6f7f9", color: "#121528", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
      <div role="alert" style={{ maxWidth: 540, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26 }}>{arabic ? "تعذر عرض الصفحة" : "We couldn’t display this page"}</h1>
        <p>{arabic ? "حاول مرة أخرى، أو أعد تحميل الصفحة. إذا استمرت المشكلة، تواصل معنا وسنساعدك." : "Try again or reload the page. If the problem continues, contact us and we’ll help."}</p>
        <p>{arabic ? "إذا كنت قد أرسلت حجزاً أو دفعت بالفعل، تحقق من حجوزاتك أو تواصل معنا قبل إعادة الحجز أو الدفع." : "If you already submitted a booking or payment, check your bookings or contact us before booking or paying again."}</p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 24 }}>
          <button style={{ ...actionStyle, background: "#ffda44" }} onClick={reset}>{arabic ? "حاول مرة أخرى" : "Try again"}</button>
          <button style={actionStyle} onClick={() => window.location.reload()}>{arabic ? "إعادة تحميل الصفحة" : "Reload page"}</button>
          <a style={actionStyle} href="/">{arabic ? "الرئيسية" : "Home"}</a>
          <a style={actionStyle} href="/my-bookings">{arabic ? "حجوزاتي" : "My bookings"}</a>
          <a style={actionStyle} href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`}>{arabic ? "تواصل معنا عبر واتساب" : "Contact us on WhatsApp"}</a>
        </div>
        {error.digest && <p style={{ fontSize: 12 }}>{arabic ? "رقم الخطأ:" : "Error reference:"} {error.digest}</p>}
      </div>
    </main>
  )
}

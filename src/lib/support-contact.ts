/** E.164 without +, for wa.me / WhatsApp click-to-chat */
export const SUPPORT_WHATSAPP_NUMBER = "201550061006"

export const INSTAPAY_LINK = "https://ipn.eg/S/karim.m.cib/instapay/5bCbda"

export function buildWhatsAppHref(prefill: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    prefill,
  )}`
}

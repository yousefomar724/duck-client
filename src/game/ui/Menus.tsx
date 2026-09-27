"use client"

import { Gamepad2, Hand, Home, Languages, Play, RotateCcw, Share2, Volume2, VolumeX } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { sfx } from "../audio/sfx"
import { useGameUI } from "./store"

const btnPrimary =
  "flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f5e847] px-6 py-4 text-lg font-black text-[#121528] shadow-[0_6px_0_#b8ad2a] transition active:translate-y-1 active:shadow-[0_2px_0_#b8ad2a]"
const btnGhost =
  "flex items-center justify-center gap-2 rounded-2xl border-2 border-white/25 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15 active:scale-[0.98]"

function Panel({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const locale = useLocale()
  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`pointer-events-auto relative mx-auto w-full ${wide ? "max-w-md" : "max-w-sm"} rounded-3xl border border-white/15 bg-[#121528]/88 p-5 text-white shadow-2xl backdrop-blur-md`}
    >
      {children}
    </div>
  )
}

export function LoadingScreen({ progress, error, onRetry }: { progress: number; error: string | null; onRetry: () => void }) {
  const t = useTranslations("game")
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-[#121528] p-6 text-white">
      <Image src="/duck.png" alt="" width={96} height={74} className="animate-bounce" priority />
      <div className="text-2xl font-black text-[#f5e847]">{t("title")}</div>
      {error ? (
        <>
          <p className="max-w-xs text-center text-white/80">{t("loadError")}</p>
          <button type="button" className={btnGhost} onClick={onRetry}>
            <RotateCcw className="h-4 w-4" /> {t("retry")}
          </button>
        </>
      ) : (
        <>
          <div className="h-2 w-56 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[#f5e847] transition-all duration-300" style={{ width: `${Math.max(6, progress)}%` }} />
          </div>
          <p className="text-sm text-white/70">{t("loading")}</p>
        </>
      )}
    </div>
  )
}

function SettingsRow() {
  const t = useTranslations("game")
  const settings = useGameUI((s) => s.settings)
  const setSettings = useGameUI((s) => s.setSettings)
  const locale = useLocale()
  const router = useRouter()
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-white/60">{t("controls")}</div>
        <div className="grid grid-cols-2 gap-2">
          {(["paddle", "joystick"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                sfx.click()
                setSettings({ controls: mode })
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${
                settings.controls === mode ? "border-[#f5e847] bg-[#f5e847]/15 text-[#f5e847]" : "border-white/15 text-white/80"
              }`}
              aria-pressed={settings.controls === mode}
            >
              {mode === "paddle" ? <Hand className="h-4 w-4" /> : <Gamepad2 className="h-4 w-4" />}
              {mode === "paddle" ? t("controlsPaddle") : t("controlsJoystick")}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs leading-snug text-white/60">
          {settings.controls === "paddle" ? t("controlsPaddleHint") : t("controlsJoystickHint")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            setSettings({ sound: !settings.sound })
            sfx.setEnabled(!settings.sound)
          }}
          aria-pressed={settings.sound}
        >
          {settings.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {t("sound")}: {settings.sound ? t("on") : t("off")}
        </button>
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            // Same mechanism as the site's language switcher: a cookie read by next-intl.
            document.cookie = `locale=${locale === "ar" ? "en" : "ar"};path=/;max-age=31536000`
            router.refresh()
          }}
        >
          <Languages className="h-4 w-4" />
          {t("language")}
        </button>
      </div>
    </div>
  )
}

export function TitleScreen({ onPlay }: { onPlay: () => void }) {
  const t = useTranslations("game")
  const best = useGameUI((s) => s.best)
  const [showHow, setShowHow] = useState(false)
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end overflow-y-auto bg-gradient-to-t from-[#121528]/80 via-[#121528]/10 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-center">
      <Panel wide>
        <div className="mb-4 flex items-center gap-3">
          <Image src="/duck.png" alt="Duck" width={56} height={43} priority />
          <div>
            <h1 className="text-3xl font-black leading-none text-[#f5e847]">{t("title")}</h1>
            <p className="mt-1 text-sm text-white/75">{t("subtitle")}</p>
          </div>
        </div>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => {
            sfx.unlock()
            sfx.click()
            onPlay()
          }}
        >
          <Play className="h-5 w-5 fill-current" /> {t("play")}
        </button>
        {best > 0 && <p className="mt-2 text-center text-sm font-semibold text-white/70">{t("best", { score: best })}</p>}

        <button type="button" onClick={() => setShowHow((v) => !v)} className="mt-4 w-full text-start text-sm font-bold text-[#7fd3ee] underline-offset-4 hover:underline" aria-expanded={showHow}>
          {t("howToPlay")} {showHow ? "▴" : "▾"}
        </button>
        {showHow && (
          <ol className="mt-2 space-y-1.5 text-[13px] leading-snug text-white/85">
            {(["collect", "deliver", "avoid", "sunset"] as const).map((k, i) => (
              <li key={k} className="flex gap-2">
                <span className="font-black text-[#f5e847]">{i + 1}.</span>
                <span>{t(`howSteps.${k}`)}</span>
              </li>
            ))}
            <li className="pt-1 text-xs text-white/55 max-sm:hidden">{t("keyboardHint")}</li>
          </ol>
        )}
        <div className="my-4 h-px bg-white/10" />
        <SettingsRow />
        <div className="mt-4 flex items-center justify-between text-xs text-white/50">
          <Link href="/" className="flex items-center gap-1 font-semibold hover:text-white">
            <Home className="h-3.5 w-3.5" /> {t("backToSite")}
          </Link>
          <span>{t("attribution")}</span>
        </div>
      </Panel>
    </div>
  )
}

export function PauseMenu({ onResume, onRestart, onQuit }: { onResume: () => void; onRestart: () => void; onQuit: () => void }) {
  const t = useTranslations("game")
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#121528]/55 p-4 backdrop-blur-[2px]">
      <Panel>
        <h2 className="mb-4 text-center text-2xl font-black text-[#f5e847]">{t("paused")}</h2>
        <button type="button" className={btnPrimary} onClick={onResume}>
          <Play className="h-5 w-5 fill-current" /> {t("resume")}
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className={btnGhost} onClick={onRestart}>
            <RotateCcw className="h-4 w-4" /> {t("restart")}
          </button>
          <button type="button" className={btnGhost} onClick={onQuit}>
            <Home className="h-4 w-4" /> {t("quit")}
          </button>
        </div>
        <div className="my-4 h-px bg-white/10" />
        <SettingsRow />
      </Panel>
    </div>
  )
}

/** First-run coaching, shown over live play until dismissed. */
export function Hint({ mode, onDone }: { mode: "paddle" | "joystick"; onDone: () => void }) {
  const t = useTranslations("game")
  const locale = useLocale()
  useEffect(() => {
    const id = setTimeout(onDone, 14000)
    return () => clearTimeout(id)
  }, [onDone])
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[max(7rem,calc(env(safe-area-inset-bottom)+6.5rem))] z-30 flex justify-center px-4">
      <div dir={locale === "ar" ? "rtl" : "ltr"} className="pointer-events-auto max-w-xs rounded-2xl bg-white/95 px-3 py-2 text-center text-[13px] font-semibold leading-snug text-[#121528] shadow-2xl">
        <p>{mode === "paddle" ? t("hintPaddle") : t("hintJoystick")}</p>
        <button type="button" onClick={onDone} className="mt-2 rounded-full bg-[#121528] px-4 py-1.5 text-xs font-bold text-white">
          {t("hintGotIt")}
        </button>
      </div>
    </div>
  )
}

export function Results({ onAgain, onQuit }: { onAgain: () => void; onQuit: () => void }) {
  const t = useTranslations("game")
  const r = useGameUI((s) => s.results)
  const [shown, setShown] = useState(0)
  const [copied, setCopied] = useState(false)

  // Count the score up — a small victory lap.
  useEffect(() => {
    if (!r) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1100)
      setShown(Math.round(r.score * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [r])

  if (!r) return null
  const share = async () => {
    const text = t("shareText", { count: r.rescued, score: r.score })
    const url = `${window.location.origin}/play`
    try {
      if (navigator.share) await navigator.share({ title: t("title"), text, url })
      else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  }
  const stats: [string, string | number][] = [
    [t("statRescued"), r.rescued],
    [t("statGolden"), r.golden],
    [t("statLandmarks"), `${r.landmarks}/${r.totalLandmarks}`],
    [t("statBestLine"), r.bestLine],
  ]
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center overflow-y-auto bg-gradient-to-t from-[#121528]/85 to-[#121528]/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center">
      <Panel wide>
        <h2 className="text-center text-lg font-bold text-white/80">{t("resultsTitle")}</h2>
        <div className="my-1 text-center text-6xl font-black tabular-nums text-[#f5e847]">{shown}</div>
        <p className="mb-4 text-center text-sm font-semibold text-white/70">
          {r.isBest ? <span className="text-[#f5e847]">★ {t("newBest")}</span> : t("best", { score: r.best })}
        </p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white/8 px-3 py-2">
              <div className="text-xl font-black tabular-nums">{value}</div>
              <div className="text-[11px] font-semibold text-white/60">{label}</div>
            </div>
          ))}
        </div>
        <button type="button" className={btnPrimary} onClick={onAgain}>
          <RotateCcw className="h-5 w-5" /> {t("playAgain")}
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className={btnGhost} onClick={share}>
            <Share2 className="h-4 w-4" /> {copied ? t("copied") : t("share")}
          </button>
          <button type="button" className={btnGhost} onClick={onQuit}>
            <Home className="h-4 w-4" /> {t("quit")}
          </button>
        </div>
        <Link
          href="/trips"
          className="mt-3 block rounded-2xl bg-[#067ba1] px-4 py-3 text-center text-white shadow-lg transition hover:bg-[#08688a]"
        >
          <span className="block text-base font-black">{t("bookCta")} →</span>
          <span className="block text-xs text-white/80">{t("bookCtaSub")}</span>
        </Link>
      </Panel>
    </div>
  )
}

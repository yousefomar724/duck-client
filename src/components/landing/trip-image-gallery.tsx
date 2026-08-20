"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { useReducedMotion } from "framer-motion"
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Dialog as DialogPrimitive } from "radix-ui"
import { ImageWithLogoFallback } from "@/components/shared/image-with-logo-fallback"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const PREVIEW_THUMB_COUNT = 3

type TripImageGalleryProps = {
  images: string[]
  alt: string
}

export function TripImageGallery({ images, alt }: TripImageGalleryProps) {
  const t = useTranslations("tripPage")
  const photos = images.filter(Boolean)
  const [open, setOpen] = useState(false)
  const [startIndex, setStartIndex] = useState(0)

  const openAt = (index: number) => {
    setStartIndex(index)
    setOpen(true)
  }

  const hero = photos[0] ?? null
  const previewThumbs = photos.slice(1, 1 + PREVIEW_THUMB_COUNT)
  const extraCount = Math.max(0, photos.length - (1 + PREVIEW_THUMB_COUNT))

  return (
    <>
      <div className="space-y-3">
        {hero ? (
          <button
            type="button"
            onClick={() => openAt(0)}
            aria-label={
              photos.length > 1
                ? t("viewPhotos")
                : t("viewPhoto", { n: 1, total: 1 })
            }
            className="group relative aspect-[16/9] w-full cursor-zoom-in overflow-hidden rounded-2xl bg-gray-100 text-start outline-none focus-visible:ring-2 focus-visible:ring-duck-cyan focus-visible:ring-offset-2"
          >
            <ImageWithLogoFallback
              src={hero}
              alt={t("photoAlt", { name: alt, n: 1, total: photos.length })}
              fill
              priority
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10 motion-reduce:transition-none" />
            <span className="pointer-events-none absolute end-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <Images className="size-3.5" aria-hidden="true" />
              {t("viewPhotos")}
              {photos.length > 1 ? (
                <span className="text-white/80">· {photos.length}</span>
              ) : null}
            </span>
          </button>
        ) : (
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-gray-100">
            <ImageWithLogoFallback
              src={null}
              alt={alt}
              fill
              priority
              className="object-cover"
            />
          </div>
        )}

        {previewThumbs.length > 0 ? (
          <div
            className={cn(
              "grid gap-3",
              previewThumbs.length === 1 && "grid-cols-1 sm:grid-cols-3",
              previewThumbs.length === 2 && "grid-cols-2",
              previewThumbs.length >= 3 && "grid-cols-3",
            )}
          >
            {previewThumbs.map((src, i) => {
              const photoIndex = i + 1
              const isLastThumb = i === previewThumbs.length - 1 && extraCount > 0
              return (
                <button
                  key={`${src}-${photoIndex}`}
                  type="button"
                  onClick={() => openAt(photoIndex)}
                  aria-label={
                    isLastThumb
                      ? t("viewPhotos")
                      : t("viewPhoto", {
                          n: photoIndex + 1,
                          total: photos.length,
                        })
                  }
                  className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-lg bg-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-duck-cyan focus-visible:ring-offset-2"
                >
                  <ImageWithLogoFallback
                    src={src}
                    alt={t("photoAlt", {
                      name: alt,
                      n: photoIndex + 1,
                      total: photos.length,
                    })}
                    fill
                    sizes="(max-width: 768px) 33vw, 290px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                  {isLastThumb ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-semibold text-white">
                      {t("morePhotos", { count: extraCount })}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {photos.length > 0 ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogPortal>
            <DialogOverlay className="z-[1000]! bg-black/80!" />
            {open ? (
              <TripImageLightbox
                key={startIndex}
                images={photos}
                alt={alt}
                initialIndex={startIndex}
                onClose={() => setOpen(false)}
              />
            ) : null}
          </DialogPortal>
        </Dialog>
      ) : null}
    </>
  )
}

function TripImageLightbox({
  images,
  alt,
  initialIndex,
  onClose,
}: {
  images: string[]
  alt: string
  initialIndex: number
  onClose: () => void
}) {
  const t = useTranslations("tripPage")
  const locale = useLocale()
  const reduceMotion = useReducedMotion()
  const isRtl = locale === "ar"
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([])

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: images.length > 1,
    startIndex: initialIndex,
    duration: reduceMotion ? 0 : 20,
    direction: isRtl ? "rtl" : "ltr",
    align: "center",
  })

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi])

  useEffect(() => {
    const thumb = thumbRefs.current[selectedIndex]
    if (typeof thumb?.scrollIntoView === "function") {
      thumb.scrollIntoView({
        behavior: reduceMotion ? "instant" : "smooth",
        inline: "center",
        block: "nearest",
      })
    }
  }, [selectedIndex, reduceMotion])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      if (isRtl) scrollNext()
      else scrollPrev()
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      if (isRtl) scrollPrev()
      else scrollNext()
    } else if (event.key === "Home") {
      event.preventDefault()
      emblaApi?.scrollTo(0)
    } else if (event.key === "End") {
      event.preventDefault()
      emblaApi?.scrollTo(images.length - 1)
    }
  }

  const showControls = images.length > 1

  return (
    <DialogPrimitive.Content
      aria-describedby={undefined}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[1001] flex h-dvh w-full flex-col bg-black outline-none"
    >
      <DialogTitle className="sr-only">
        {t("galleryTitle", { name: alt })}
      </DialogTitle>

      <div className="relative z-10 flex items-center justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 md:px-5">
        <p className="text-sm font-medium text-white/90 tabular-nums">
          {showControls
            ? t("photoCount", {
                current: selectedIndex + 1,
                total: images.length,
              })
            : null}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11! rounded-full text-white hover:bg-white/15 hover:text-white"
          aria-label={t("closeGallery")}
          onClick={onClose}
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center">
        {showControls ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute start-2 z-10 size-11! rounded-full border border-white/20 bg-black/45 text-white hover:bg-black/70 hover:text-white md:start-4"
            aria-label={t("previousPhoto")}
            onClick={scrollPrev}
          >
            <ChevronLeft className="size-6 rtl:rotate-180" />
          </Button>
        ) : null}

        <div ref={emblaRef} className="h-full min-h-0 w-full overflow-hidden">
          <div className="flex h-full">
            {images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="flex min-w-0 shrink-0 grow-0 basis-full items-center justify-center px-12 md:px-20"
              >
                <div className="relative h-[min(70dvh,calc(100dvh-11rem))] w-full max-w-5xl">
                  <ImageWithLogoFallback
                    src={src}
                    alt={t("photoAlt", {
                      name: alt,
                      n: i + 1,
                      total: images.length,
                    })}
                    fill
                    sizes="100vw"
                    priority={i === initialIndex}
                    draggable={false}
                    className="object-contain select-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {showControls ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute end-2 z-10 size-11! rounded-full border border-white/20 bg-black/45 text-white hover:bg-black/70 hover:text-white md:end-4"
            aria-label={t("nextPhoto")}
            onClick={scrollNext}
          >
            <ChevronRight className="size-6 rtl:rotate-180" />
          </Button>
        ) : null}
      </div>

      {showControls ? (
        <div className="relative z-10 flex justify-center gap-2 overflow-x-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {images.map((src, i) => (
            <button
              key={`thumb-${src}-${i}`}
              ref={(node) => {
                thumbRefs.current[i] = node
              }}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={t("viewPhoto", { n: i + 1, total: images.length })}
              aria-current={i === selectedIndex ? "true" : undefined}
              className={cn(
                "relative size-14 shrink-0 overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-black transition-opacity outline-none focus-visible:ring-duck-cyan",
                i === selectedIndex
                  ? "opacity-100 ring-white"
                  : "opacity-60 ring-transparent hover:opacity-100",
              )}
            >
              <ImageWithLogoFallback
                src={src}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </DialogPrimitive.Content>
  )
}

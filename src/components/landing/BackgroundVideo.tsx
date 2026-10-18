interface BackgroundVideoProps {
  src: string
  /** Painted immediately while the video downloads — this is what LCP measures. */
  poster: string
  className?: string
}

/**
 * Decorative, silent, looping background video for the above-the-fold hero.
 *
 * Marked `aria-hidden` because it carries no information — the section's heading
 * and copy do. That also keeps it out of the "video needs captions" audit, which
 * would otherwise flag a soundless background loop.
 */
export default function BackgroundVideo({
  src,
  poster,
  className,
}: BackgroundVideoProps) {
  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      tabIndex={-1}
      poster={poster}
      preload="metadata"
      className={className}
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}

import { useState } from "react"

/**
 * Attendance selfie. If the real photo cannot be loaded it says so, instead of
 * silently showing some other picture. Pass `key={src}` so the error state resets
 * when a different photo is shown. Shown mirrored (like the live selfie camera) by default;
 * this is display-only, the stored photo is never changed.
 */
export default function SelfieImage({ src, alt, className = "", fallbackClassName = "", mirror = true }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 px-2 text-center text-xs font-semibold text-gray-400 ${fallbackClassName || className}`}
      >
        Photo not available
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={mirror ? { transform: "scaleX(-1)" } : undefined}
      onError={() => setFailed(true)}
    />
  )
}

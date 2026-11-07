import { useEffect } from "react"
import { createPortal } from "react-dom"

/**
 * Shared dialog shell for admin pages.
 * - Rendered on document.body, so the sticky page header can never overlap it
 * - Bottom sheet on phones, centred dialog on larger screens
 * - Scrolls when the content is taller than the screen
 * - Closes on Escape or a tap on the backdrop (unless disableClose)
 */
export default function ModalShell({ onClose, maxWidth = "sm:max-w-md", disableClose = false, children }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !disableClose) onClose()
    }
    window.addEventListener("keydown", onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, disableClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !disableClose) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl ${maxWidth}`}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

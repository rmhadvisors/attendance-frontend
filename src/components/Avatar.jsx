function initialsOf(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")
}

/** Round initials avatar in the app's green. */
export default function Avatar({ name, size = "h-10 w-10", text = "text-sm", className = "" }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 font-bold text-white shadow-sm ${size} ${text} ${className}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  )
}

interface VenuIconProps {
  size?: number
  className?: string
}

export default function VenuIcon({ size = 32, className }: VenuIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="100" height="100" rx="22" fill="#5B50CC" />
      {/* Secondary V — muted purple, offset right */}
      <path
        d="M 33 24 L 57 74 L 81 24"
        stroke="#8580D0"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Primary V — white, offset left */}
      <path
        d="M 19 24 L 43 74 L 67 24"
        stroke="white"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

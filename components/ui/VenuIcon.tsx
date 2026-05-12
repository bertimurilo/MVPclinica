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
        d="M 34 20 L 58 78 L 82 20"
        stroke="#8A86D4"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Primary V — white, offset left */}
      <path
        d="M 18 20 L 42 78 L 66 20"
        stroke="white"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

import Image from 'next/image'

interface VenuIconProps {
  size?: number
  className?: string
}

export default function VenuIcon({ size = 32, className }: VenuIconProps) {
  return (
    <Image
      src="/venu_logo_icon.png"
      alt="Venu"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: size * 0.22 }}
    />
  )
}

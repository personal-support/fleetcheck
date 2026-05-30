interface ConsuldataLogoProps {
  variant?: 'dark' | 'light'
  height?: number
}
export function ConsuldataLogo({ variant = 'dark', height = 32 }: ConsuldataLogoProps) {
  return <img src="/LOGO_ALPHA.png" alt="Alpha Comex e Transportes" style={{ height, width: 'auto', objectFit: 'contain' }} />
}

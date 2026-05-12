interface ConsuldataLogoProps {
  variant?: 'dark' | 'light'  // dark = white text for navy header, light = colored for white bg
  height?: number
}

export function ConsuldataLogo({ variant = 'dark', height = 32 }: ConsuldataLogoProps) {
  const textColor = variant === 'dark' ? '#ffffff' : '#212771'
  const accentColor = variant === 'dark' ? '#f86924' : '#f86924'
  const fontSize = height * 0.45
  const subFontSize = height * 0.22

  return (
    <svg
      width={height * 3.2}
      height={height}
      viewBox={`0 0 ${height * 3.2} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      {/* C icon */}
      <circle cx={height * 0.5} cy={height * 0.5} r={height * 0.42} fill={accentColor} />
      <path
        d={`M ${height*0.64} ${height*0.22} A ${height*0.28} ${height*0.28} 0 1 0 ${height*0.64} ${height*0.78}`}
        stroke="white" strokeWidth={height * 0.1} fill="none" strokeLinecap="round"
      />
      {/* Text */}
      <text
        x={height * 1.1}
        y={height * 0.58}
        fill={textColor}
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="'Open Sans', sans-serif"
        letterSpacing="-0.5"
      >
        Consul<tspan fill={accentColor}>data</tspan>
      </text>
      <text
        x={height * 1.1}
        y={height * 0.82}
        fill={variant === 'dark' ? 'rgba(255,255,255,0.55)' : '#8d949a'}
        fontSize={subFontSize}
        fontFamily="'Open Sans', sans-serif"
        letterSpacing="0.5"
      >
        TELEPROCESSAMENTO
      </text>
    </svg>
  )
}

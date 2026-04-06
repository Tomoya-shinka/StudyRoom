/** カラー絵文字の代わりに使う、currentColor の線画アイコン */

type IconProps = { className?: string }

const common = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconBook({ className = 'w-10 h-10' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path {...common} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path {...common} d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

export function IconMic({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path {...common} d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path {...common} d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path {...common} d="M12 19v3M9 22h6" />
    </svg>
  )
}

export function IconMicOff({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <line x1="2" y1="2" x2="22" y2="22" {...common} />
      <path {...common} d="M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.6" />
      <path {...common} d="M17 17a7 7 0 0 1-12-6V9M12 19v3M9 22h6" />
    </svg>
  )
}

export function IconVideo({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path {...common} d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 10.5" />
      <rect {...common} x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  )
}

export function IconVideoOff({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path {...common} d="M2 2l20 20" />
      <path {...common} d="M8.5 8.5H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h9" />
      <path {...common} d="M10.5 6.5H16a2 2 0 0 1 2 2v5.5" />
      <path {...common} d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V9.5" />
    </svg>
  )
}

export function IconLink({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        {...common}
        d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L9 6M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 0 0 7.07 7.07L14 18"
      />
    </svg>
  )
}

export function IconCheck({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path {...common} d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function IconLayoutGrid({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect {...common} x="3" y="3" width="8" height="8" rx="1" />
      <rect {...common} x="13" y="3" width="8" height="8" rx="1" />
      <rect {...common} x="3" y="13" width="8" height="8" rx="1" />
      <rect {...common} x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  )
}

export function IconLayoutSpeaker({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect {...common} x="2" y="2" width="16" height="20" rx="1.5" />
      <rect {...common} x="19" y="15" width="5" height="7" rx="1" />
    </svg>
  )
}

export function IconLayoutSpotlight({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect {...common} x="2" y="2" width="5" height="5" rx="0.75" />
      <rect {...common} x="9.5" y="2" width="5" height="5" rx="0.75" />
      <rect {...common} x="17" y="2" width="5" height="5" rx="0.75" />
      <rect {...common} x="2" y="10" width="20" height="12" rx="1.5" />
    </svg>
  )
}

export function IconSettings({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        {...common}
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path {...common} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

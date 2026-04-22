export default function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="logo-mark"
    >
      {/* Outer hexagon ring */}
      <path
        d="M16 2L28 8.5V23.5L16 30L4 23.5V8.5L16 2Z"
        fill="none"
        stroke="#6366f1"
        strokeWidth="1.5"
      />
      {/* Inner hexagon */}
      <path
        d="M16 7L24 11.5V20.5L16 25L8 20.5V11.5L16 7Z"
        fill="rgba(99,102,241,0.12)"
        stroke="#818cf8"
        strokeWidth="1"
      />
      {/* Lock shackle */}
      <path
        d="M13 15V13.5C13 11.84 14.34 10.5 16 10.5C17.66 10.5 19 11.84 19 13.5V15"
        stroke="#c7d2fe"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Lock body */}
      <rect x="12" y="15" width="8" height="6" rx="1.5" fill="#6366f1" />
      {/* Keyhole */}
      <circle cx="16" cy="17.5" r="1" fill="#c7d2fe" />
      <rect x="15.5" y="18" width="1" height="1.5" rx="0.5" fill="#c7d2fe" />
    </svg>
  );
}

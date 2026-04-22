export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <polygon points="13,1 23,7 23,19 13,25 3,19 3,7" stroke="#00ff41" strokeWidth="1" fill="rgba(0,255,65,0.04)" />
      <path d="M10 13V11.5C10 9.57 11.57 8 13.5 8C15.43 8 17 9.57 17 11.5V13" stroke="#00ff41" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="9.5" y="13" width="8" height="5.5" rx="1.2" fill="#00ff41" />
      <circle cx="13.5" cy="15" r="1" fill="#000" />
      <rect x="13" y="15.8" width="1" height="1.6" rx="0.5" fill="#000" />
    </svg>
  );
}

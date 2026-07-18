/** Verbatim port of the reference hero illustration SVG. */
export function HeroIllustration() {
  return (
    <svg
      className="illus-svg"
      viewBox="0 0 500 520"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="500" height="520" fill="#0C1F3A" />
      <g fill="#3ECF6E" opacity="0.09">
        <circle cx="60" cy="70" r="1.3" />
        <circle cx="120" cy="70" r="1.3" />
        <circle cx="180" cy="70" r="1.3" />
        <circle cx="240" cy="70" r="1.3" />
        <circle cx="300" cy="70" r="1.3" />
        <circle cx="360" cy="70" r="1.3" />
        <circle cx="420" cy="70" r="1.3" />
        <circle cx="60" cy="130" r="1.3" />
        <circle cx="420" cy="130" r="1.3" />
        <circle cx="60" cy="190" r="1.3" />
        <circle cx="420" cy="190" r="1.3" />
        <circle cx="60" cy="250" r="1.3" />
        <circle cx="420" cy="250" r="1.3" />
        <circle cx="60" cy="310" r="1.3" />
        <circle cx="420" cy="310" r="1.3" />
        <circle cx="60" cy="370" r="1.3" />
        <circle cx="420" cy="370" r="1.3" />
        <circle cx="60" cy="430" r="1.3" />
        <circle cx="120" cy="430" r="1.3" />
        <circle cx="180" cy="430" r="1.3" />
        <circle cx="240" cy="430" r="1.3" />
        <circle cx="300" cy="430" r="1.3" />
        <circle cx="360" cy="430" r="1.3" />
        <circle cx="420" cy="430" r="1.3" />
      </g>
      <g stroke="#2A5F8A" strokeWidth="1.2" fill="none" opacity="0.85">
        <path d="M 130 440 L 130 220 L 210 220 L 210 165 L 290 165 L 290 220 L 370 220 L 370 440" />
        <line x1="130" y1="440" x2="370" y2="440" />
      </g>
      <g stroke="#1E4A6E" strokeWidth="0.8" fill="none" opacity="0.5">
        <line x1="145" y1="440" x2="145" y2="240" />
        <line x1="160" y1="440" x2="160" y2="240" />
        <line x1="175" y1="440" x2="175" y2="240" />
        <line x1="190" y1="440" x2="190" y2="240" />
        <line x1="225" y1="440" x2="225" y2="185" />
        <line x1="240" y1="440" x2="240" y2="185" />
        <line x1="255" y1="440" x2="255" y2="185" />
        <line x1="270" y1="440" x2="270" y2="185" />
        <line x1="305" y1="440" x2="305" y2="240" />
        <line x1="320" y1="440" x2="320" y2="240" />
        <line x1="335" y1="440" x2="335" y2="240" />
        <line x1="350" y1="440" x2="350" y2="240" />
      </g>
      <g stroke="#3ECF6E" strokeWidth="1" fill="none" opacity="0.5">
        <line x1="130" y1="240" x2="370" y2="240" />
        <line x1="130" y1="290" x2="370" y2="290" />
        <line x1="130" y1="340" x2="370" y2="340" />
        <line x1="130" y1="390" x2="370" y2="390" />
      </g>
      <g fill="#E8A33D">
        <circle cx="250" cy="145" r="4" />
      </g>
      <g stroke="#E8A33D" strokeWidth="0.8" opacity="0.7" fill="none">
        <line x1="250" y1="149" x2="250" y2="165" />
      </g>
      <g fill="#EAF0F6" opacity="0.85">
        <rect x="247" y="447" width="6" height="10" />
        <circle cx="250" cy="444" r="3.5" />
      </g>
      <g stroke="#EAF0F6" strokeWidth="0.6" fill="none" opacity="0.4">
        <line x1="250" y1="457" x2="248" y2="470" />
        <line x1="250" y1="457" x2="252" y2="470" />
      </g>
      <g fill="#3ECF6E" opacity="0.3">
        <circle cx="130" cy="220" r="2.5" />
        <circle cx="210" cy="220" r="2.5" />
        <circle cx="210" cy="165" r="2.5" />
        <circle cx="290" cy="165" r="2.5" />
        <circle cx="290" cy="220" r="2.5" />
        <circle cx="370" cy="220" r="2.5" />
      </g>
    </svg>
  );
}

/** Reference "flow lead" thumbnail SVG (fallback when article has no image). */
export function LeadThumbFallback() {
  return (
    <svg
      viewBox="0 0 400 250"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <rect width="400" height="250" fill="#0F2847" />
      <g stroke="#2A5F8A" strokeWidth="1" fill="none" opacity="0.7">
        <path d="M 60 200 Q 60 100 200 100 Q 340 100 340 200 L 340 220 L 60 220 Z" />
        <line x1="200" y1="100" x2="200" y2="220" />
      </g>
      <g fill="#B48EDE" opacity="0.85">
        <circle cx="140" cy="145" r="14" />
      </g>
      <g fill="#3ECF6E" opacity="0.5">
        <circle cx="260" cy="145" r="10" />
      </g>
      <g stroke="#B48EDE" strokeWidth="1.5" fill="none">
        <path d="M 140 145 L 260 145" strokeDasharray="4 3" />
      </g>
    </svg>
  );
}

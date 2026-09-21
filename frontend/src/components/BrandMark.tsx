interface BrandMarkProps {
  size?: number;
  showLabel?: boolean;
}

export function BrandMark({ size = 56, showLabel = true }: BrandMarkProps) {
  const circleSize = size;
  const fontSizeM = Math.round(size * 0.42);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="rounded-full flex items-center justify-center shrink-0"
        style={{
          width: circleSize,
          height: circleSize,
          background: '#E8751A',
          boxShadow: '0 6px 20px rgba(232,117,26,0.35), 0 1px 3px rgba(0,0,0,0.12)',
          border: '1.5px solid rgba(255,255,255,0.9)',
        }}
      >
        <span
          className="font-heading font-800 text-white select-none"
          style={{
            fontSize: fontSizeM,
            letterSpacing: '0.02em',
            lineHeight: 1,
            fontFamily: 'Sora, sans-serif',
          }}
        >
          M
        </span>
      </div>
      {showLabel && (
        <span
          className="select-none"
          style={{
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: size >= 56 ? 11 : 10,
            letterSpacing: '0.08em',
            color: '#5A3E2B',
            lineHeight: 1,
          }}
        >
          Mina la Préférée
        </span>
      )}
    </div>
  );
}

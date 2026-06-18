interface BlurTextProps {
  text: string;
  className?: string;
  /** ms delay between each word */
  wordDelay?: number;
  /** animation duration in seconds */
  duration?: number;
  /** initial delay before first word, in ms */
  startDelay?: number;
}

export default function BlurText({
  text,
  className = '',
  wordDelay = 90,
  duration = 0.7,
  startDelay = 0,
}: BlurTextProps) {
  const words = text.split(' ');

  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="inline-block animate-blur-in"
          style={{
            '--blur-duration': `${duration}s`,
            animationDelay: `${startDelay + i * wordDelay}ms`,
          } as React.CSSProperties}
        >
          {word}
          {i < words.length - 1 ? '\u00a0' : ''}
        </span>
      ))}
    </span>
  );
}

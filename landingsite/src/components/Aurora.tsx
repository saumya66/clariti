interface AuroraProps {
  className?: string;
}

export default function Aurora({ className = '' }: AuroraProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
    </div>
  );
}

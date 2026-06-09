interface Props {
  label?: string;
  compact?: boolean;
}

export default function LoadingMetronome({ label = '読み込み中...', compact = false }: Props) {
  return (
    <div className={`loading-metronome ${compact ? 'loading-metronome-compact' : ''}`} role="status" aria-live="polite">
      <div className="metronome-body" aria-hidden="true">
        <div className="metronome-needle" />
        <div className="metronome-pivot" />
      </div>
      <div className="metronome-beats" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="text-sm font-medium text-primary-700">{label}</p>
    </div>
  );
}

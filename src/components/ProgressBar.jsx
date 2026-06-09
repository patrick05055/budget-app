export default function ProgressBar({ spent, budget, color }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const fill = color || (pct < 80 ? 'var(--green)' : pct < 100 ? 'var(--amber)' : 'var(--red)')
  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: fill }} />
      </div>
      <div className="progress-label">{pct.toFixed(0)}% used</div>
    </div>
  )
}

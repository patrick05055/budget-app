import { toWeekly } from '../lib/supabase.js'
import ProgressBar from './ProgressBar.jsx'

const CAT_CONFIG = [
  { key: 'groceries', expKey: 'groceries_expense_name', label: 'Groceries', emoji: '🛒', color: 'var(--green)' },
  { key: 'fun',       expKey: 'fun_expense_name',       label: 'Fun/Rest',  emoji: '🎉', color: 'var(--purple)' },
  { key: 'health',    expKey: 'health_expense_name',    label: 'Health',    emoji: '💊', color: 'var(--pink)' },
]

function getBudget(expenses, spendCats, expKey) {
  const name = spendCats[expKey] || ''
  const exp  = expenses.find((r) => r.name.trim().toLowerCase() === name.trim().toLowerCase())
  return exp ? toWeekly(exp.amount, exp.freq) : 0
}

export default function HomeScreen({ appData }) {
  const { expenses, weekly_log, weekly_spend_cats, income } = appData

  const totalIncW = income.reduce((s, r) => s + toWeekly(r.amount, r.freq), 0)
  const totalExpW = expenses.reduce((s, r) => s + toWeekly(r.amount, r.freq), 0)
  const savRate   = totalIncW > 0 ? ((totalIncW - totalExpW) / totalIncW * 100) : 0

  const cats = CAT_CONFIG.map((c) => {
    const budget = getBudget(expenses, weekly_spend_cats, c.expKey)
    const spent  = (weekly_log[c.key] || []).reduce((s, e) => s + e.amount, 0)
    return { ...c, budget, spent, left: budget - spent }
  })

  const totalBudget = cats.reduce((s, c) => s + c.budget, 0)
  const totalSpent  = cats.reduce((s, c) => s + c.spent, 0)
  const totalLeft   = totalBudget - totalSpent

  return (
    <div>
      <div style={{ marginBottom: 20, paddingTop: 8 }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
          Week of {weekly_log.week_of}
        </p>
        <h1>Your week at a glance</h1>
      </div>

      {/* Big summary card */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">Variable budget</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '2rem', fontWeight: 500, lineHeight: 1 }}>
            ${totalLeft.toFixed(2)}
          </span>
          <span style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: 4 }}>remaining</span>
        </div>
        <ProgressBar spent={totalSpent} budget={totalBudget} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Spent <b style={{ color: 'var(--text)' }}>${totalSpent.toFixed(2)}</b></span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Budget <b style={{ color: 'var(--text)' }}>${totalBudget.toFixed(2)}</b></span>
        </div>
      </div>

      {/* Per-category mini cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {cats.map((c) => {
          const over = c.spent > c.budget
          return (
            <div key={c.key} className="card" style={{ padding: 12, marginBottom: 0 }}>
              <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{c.emoji}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>{c.label}</div>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.9rem',
                fontWeight: 500,
                color: over ? 'var(--red)' : 'var(--text)',
              }}>
                ${c.left.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>left</div>
              <ProgressBar spent={c.spent} budget={c.budget} color={c.color} />
            </div>
          )
        })}
      </div>

      {/* Income overview */}
      <div className="card">
        <div className="card-title">Income overview</div>
        <div className="metrics-row" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          <div className="metric">
            <div className="metric-label">Weekly income</div>
            <div className="metric-value">${totalIncW.toFixed(2)}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Weekly expenses</div>
            <div className="metric-value">${totalExpW.toFixed(2)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--green-soft)', borderRadius: 'var(--radius-sm)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--green)', fontWeight: 500 }}>
            Savings rate: {savRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

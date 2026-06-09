import { useState } from 'react'
import { toWeekly, archiveWeek, today } from '../lib/supabase.js'
import ProgressBar from './ProgressBar.jsx'

const CAT_CONFIG = [
  { key: 'groceries', expKey: 'groceries_expense_name', label: 'Groceries', emoji: '🛒', color: 'var(--green)' },
  { key: 'fun',       expKey: 'fun_expense_name',       label: 'Fun / Rest', emoji: '🎉', color: 'var(--purple)' },
  { key: 'health',    expKey: 'health_expense_name',    label: 'Health & Care', emoji: '💊', color: 'var(--pink)' },
]

function getBudget(expenses, spendCats, expKey) {
  const name = spendCats[expKey] || ''
  const exp  = expenses.find((r) => r.name.trim().toLowerCase() === name.trim().toLowerCase())
  return exp ? toWeekly(exp.amount, exp.freq) : 0
}

function CatSection({ cat, budget, entries, onAdd, onDelete }) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const spent = entries.reduce((s, e) => s + e.amount, 0)
  const left  = budget - spent
  const over  = left < 0

  const handleAdd = () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    onAdd(cat.key, label.trim() || 'Item', val)
    setLabel(''); setAmount('')
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: '1.2rem' }}>{cat.emoji}</span>
        <h2 style={{ flex: 1 }}>{cat.label}</h2>
        <span className={`tag ${over ? 'red' : 'green'}`}>
          {over ? `$${Math.abs(left).toFixed(2)} over` : `$${left.toFixed(2)} left`}
        </span>
      </div>

      <ProgressBar spent={spent} budget={budget} color={cat.color} />

      <div className="metrics-row" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 10 }}>
        <div className="metric">
          <div className="metric-label">Budget</div>
          <div className="metric-value">${budget.toFixed(2)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Spent</div>
          <div className="metric-value">${spent.toFixed(2)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Remaining</div>
          <div className={`metric-value ${over ? 'red' : 'green'}`}>${left.toFixed(2)}</div>
        </div>
      </div>

      {/* Add row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px auto', gap: 8, marginTop: 12 }}>
        <input placeholder="Item name" value={label} onChange={(e) => setLabel(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
        <input type="number" inputMode="decimal" placeholder="$0.00" value={amount}
               onChange={(e) => setAmount(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
               style={{ fontFamily: "'DM Mono',monospace", textAlign:'right' }} />
        <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add</button>
      </div>

      {/* Item list */}
      {entries.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {entries.map((e, idx) => (
            <div key={idx} className="item-row">
              <span className="item-name">{e.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="item-amount">${e.amount.toFixed(2)}</span>
                <button className="btn-icon" style={{ width:26,height:26,fontSize:'0.75rem' }}
                        onClick={() => onDelete(cat.key, idx)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WeeklyScreen({ appData, persist, showToast }) {
  const [resetting, setResetting] = useState(false)
  const { expenses, weekly_log, weekly_spend_cats } = appData

  const cats = CAT_CONFIG.map((c) => ({
    ...c,
    budget:  getBudget(expenses, weekly_spend_cats, c.expKey),
    entries: weekly_log[c.key] || [],
  }))

  const handleAdd = async (key, label, amount) => {
    const next = {
      ...appData,
      weekly_log: {
        ...appData.weekly_log,
        [key]: [...(appData.weekly_log[key] || []), { label, amount: +amount.toFixed(2) }],
      },
    }
    await persist(next)
  }

  const handleDelete = async (key, idx) => {
    const entries = [...(appData.weekly_log[key] || [])]
    entries.splice(idx, 1)
    await persist({ ...appData, weekly_log: { ...appData.weekly_log, [key]: entries } })
  }

  const handleReset = async () => {
    if (!window.confirm('Archive this week and start fresh?')) return
    setResetting(true)
    await archiveWeek(weekly_log, expenses, weekly_spend_cats)
    const next = { ...appData, weekly_log: { week_of: today(), groceries: [], fun: [], health: [] } }
    await persist(next)
    setResetting(false)
    showToast('Week archived ✓')
  }

  const totalBudget = cats.reduce((s, c) => s + c.budget, 0)
  const totalSpent  = cats.reduce((s, c) => s + c.entries.reduce((a, e) => a + e.amount, 0), 0)

  return (
    <div>
      <div className="section-header" style={{ paddingTop: 8 }}>
        <div>
          <p style={{ fontSize:'0.75rem',color:'var(--text-3)',fontWeight:500,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:4 }}>
            Week of
          </p>
          <h1>{weekly_log.week_of}</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleReset} disabled={resetting}>
          {resetting ? <span className="spinner" /> : '🔄 Reset week'}
        </button>
      </div>

      {/* Weekly total */}
      <div className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div className="metric-label">Total this week</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'1.4rem', fontWeight:500 }}>
            ${totalSpent.toFixed(2)}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div className="metric-label">of ${totalBudget.toFixed(2)}</div>
          <div className={`tag ${totalSpent > totalBudget ? 'red' : 'green'}`} style={{ marginTop:4 }}>
            {totalSpent > totalBudget ? 'Over budget' : 'On track'}
          </div>
        </div>
      </div>

      {cats.map((c) => (
        <CatSection
          key={c.key}
          cat={c}
          budget={c.budget}
          entries={c.entries}
          onAdd={handleAdd}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}

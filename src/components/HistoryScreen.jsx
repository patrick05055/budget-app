import { useState, useEffect } from 'react'
import { loadHistory, getAIInsights, weeklyPrompt, monthlyPrompt } from '../lib/supabase.js'
import ProgressBar from './ProgressBar.jsx'

function AIButton({ cacheKey, prompt }) {
  const [state, setState] = useState('idle') // idle | loading | done
  const [result, setResult] = useState(null)

  const handleClick = async () => {
    setState('loading')
    const text = await getAIInsights(prompt)
    setResult(text)
    setState('done')
  }

  return (
    <div>
      {state !== 'done' && (
        <button className="btn btn-ghost btn-sm" onClick={handleClick} disabled={state === 'loading'}
                style={{ width:'100%', marginTop:12 }}>
          {state === 'loading' ? <><span className="spinner" style={{marginRight:8}}/> Analysing…</> : '🤖 Get AI insights'}
        </button>
      )}
      {state === 'done' && result && (
        <div className="ai-block">{result}</div>
      )}
    </div>
  )
}

function WeekCard({ week }) {
  const [open, setOpen] = useState(false)
  const over  = week.total_spent > week.total_budget
  const pct   = week.total_budget ? (week.total_spent / week.total_budget * 100) : 0

  return (
    <div style={{ marginBottom: 8 }}>
      <div className="collapsible-header" onClick={() => setOpen((v) => !v)}>
        <div>
          <div style={{ fontSize:'0.8rem', fontWeight:600 }}>Week of {week.week_of}</div>
          <div style={{ fontSize:'0.75rem', color:'var(--text-3)', marginTop:2 }}>
            ${week.total_spent?.toFixed(2)} / ${week.total_budget?.toFixed(2)}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className={`tag ${over ? 'red' : 'green'}`}>{over ? 'Over' : 'Under'}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', color:'var(--text-3)' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {open && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderTop:'none',
                      borderRadius:'0 0 var(--radius) var(--radius)', padding:16, marginTop:-8, marginBottom:8 }}>
          <ProgressBar spent={week.total_spent} budget={week.total_budget} />

          {[
            { key:'groceries', label:'🛒 Groceries', sk:'grocery_spent',  bk:'grocery_budget',  color:'var(--green)' },
            { key:'fun',       label:'🎉 Fun/Rest',  sk:'fun_spent',      bk:'fun_budget',      color:'var(--purple)' },
            { key:'health',    label:'💊 Health',    sk:'health_spent',   bk:'health_budget',   color:'var(--pink)' },
          ].map((c) => {
            const sp = week[c.sk] || 0
            const bu = week[c.bk] || 0
            const items = week[c.key] || []
            return (
              <div key={c.key} style={{ marginTop:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:'0.825rem', fontWeight:600 }}>{c.label}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.8rem', color:'var(--text-2)' }}>
                    ${sp.toFixed(2)} / ${bu.toFixed(2)}
                  </span>
                </div>
                <ProgressBar spent={sp} budget={bu} color={c.color} />
                {items.length > 0 && (
                  <div style={{ marginTop:6 }}>
                    {items.map((it, i) => (
                      <div key={i} className="item-row" style={{ padding:'5px 0' }}>
                        <span className="item-name">{it.label}</span>
                        <span className="item-amount">${it.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <AIButton key={week.week_of} cacheKey={week.week_of} prompt={weeklyPrompt(week)} />
        </div>
      )}
    </div>
  )
}

function MonthBlock({ monthStr, weeks }) {
  const monthLabel = new Date(monthStr + '-02').toLocaleDateString('en-US', { month:'long', year:'numeric' })
  const totalSpent  = weeks.reduce((s, w) => s + (w.total_spent  || 0), 0)
  const totalBudget = weeks.reduce((s, w) => s + (w.total_budget || 0), 0)
  const totalG = weeks.reduce((s, w) => s + (w.grocery_spent || 0), 0)
  const totalF = weeks.reduce((s, w) => s + (w.fun_spent     || 0), 0)
  const totalH = weeks.reduce((s, w) => s + (w.health_spent  || 0), 0)
  const sorted  = [...weeks].sort((a, b) => a.week_of.localeCompare(b.week_of))
  const best    = sorted.reduce((a, b) =>
    (a.total_spent/a.total_budget||1) < (b.total_spent/b.total_budget||1) ? a : b)
  const worst   = sorted.reduce((a, b) =>
    (a.total_spent/a.total_budget||0) > (b.total_spent/b.total_budget||0) ? a : b)
  const over = totalSpent > totalBudget

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <h2>{monthLabel}</h2>
        <span className={`tag ${over ? 'red' : 'green'}`}>{over ? 'Over budget' : 'Under budget'}</span>
      </div>

      {/* Summary card */}
      <div className="card">
        <div className="card-title">Monthly total</div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'1.8rem', fontWeight:500, marginBottom:4 }}>
          ${totalSpent.toFixed(2)}
        </div>
        <div style={{ fontSize:'0.8rem', color:'var(--text-3)', marginBottom:12 }}>
          of ${totalBudget.toFixed(2)} budget
        </div>
        <ProgressBar spent={totalSpent} budget={totalBudget} />

        {/* Category breakdown */}
        <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            { label:'🛒 Groceries', val:totalG, bud: weeks.reduce((s,w)=>s+(w.grocery_budget||0),0), color:'var(--green)' },
            { label:'🎉 Fun',       val:totalF, bud: weeks.reduce((s,w)=>s+(w.fun_budget||0),0),     color:'var(--purple)' },
            { label:'💊 Health',    val:totalH, bud: weeks.reduce((s,w)=>s+(w.health_budget||0),0),  color:'var(--pink)' },
          ].map((c) => (
            <div key={c.label} className="metric">
              <div className="metric-label">{c.label}</div>
              <div className="metric-value" style={{ fontSize:'0.85rem' }}>${c.val.toFixed(2)}</div>
              <div style={{ fontSize:'0.68rem', color:'var(--text-3)' }}>/ ${c.bud.toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Best / worst */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12 }}>
          <div style={{ background:'var(--green-soft)', borderRadius:'var(--radius-sm)', padding:'10px 12px' }}>
            <div style={{ fontSize:'0.68rem', fontWeight:600, color:'var(--green)', marginBottom:2 }}>🏆 BEST WEEK</div>
            <div style={{ fontSize:'0.8rem', fontWeight:600 }}>{best.week_of}</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.78rem', color:'var(--text-2)' }}>
              ${best.total_spent?.toFixed(2)}
            </div>
          </div>
          <div style={{ background:'var(--red-soft)', borderRadius:'var(--radius-sm)', padding:'10px 12px' }}>
            <div style={{ fontSize:'0.68rem', fontWeight:600, color:'var(--red)', marginBottom:2 }}>📉 TOUGHEST WEEK</div>
            <div style={{ fontSize:'0.8rem', fontWeight:600 }}>{worst.week_of}</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.78rem', color:'var(--text-2)' }}>
              ${worst.total_spent?.toFixed(2)}
            </div>
          </div>
        </div>

        <AIButton key={`month_${monthStr}`} cacheKey={`month_${monthStr}`}
                  prompt={monthlyPrompt(monthStr, weeks)} />
      </div>

      {/* Week cards */}
      <div style={{ marginTop:12 }}>
        <div className="card-title" style={{ marginBottom:8 }}>Weeks</div>
        {sorted.map((w) => <WeekCard key={w.week_of} week={w} />).reverse()}
      </div>
    </div>
  )
}

export default function HistoryScreen() {
  const [history, setHistory] = useState(null)

  useEffect(() => {
    loadHistory().then(setHistory)
  }, [])

  if (!history) return (
    <div style={{ display:'flex', justifyContent:'center', paddingTop:60 }}>
      <div className="spinner" />
    </div>
  )

  if (history.length === 0) return (
    <div>
      <div style={{ paddingTop:8, marginBottom:20 }}><h1>History</h1></div>
      <div className="empty">
        <div style={{ fontSize:'2rem', marginBottom:12 }}>📭</div>
        No history yet. Complete your first week and hit Reset to start building your record.
      </div>
    </div>
  )

  // Group by month
  const byMonth = {}
  for (const w of history) {
    if (!byMonth[w.month]) byMonth[w.month] = []
    byMonth[w.month].push(w)
  }
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      <div style={{ paddingTop:8, marginBottom:20 }}><h1>History</h1></div>
      {months.map((m) => (
        byMonth[m].length >= 2
          ? <MonthBlock key={m} monthStr={m} weeks={byMonth[m]} />
          : (
            <div key={m} style={{ marginBottom:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <h2>{new Date(m+'-02').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</h2>
                <span className="tag amber">1 week so far</span>
              </div>
              {byMonth[m].map((w) => <WeekCard key={w.week_of} week={w} />)}
            </div>
          )
      ))}
    </div>
  )
}

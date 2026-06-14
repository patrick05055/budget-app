import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { loadHistory, getAIInsights, weeklyPrompt, monthlyPrompt } from '../lib/supabase.js'
import ProgressBar from './ProgressBar.jsx'

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  green:  '#1a9e75',
  purple: '#7068c8',
  pink:   '#d4608a',
  amber:  '#c47c17',
  red:    '#d44f3a',
  border: '#ebebeb',
  text2:  '#6b6b6b',
  text3:  '#a0a0a0',
  bg:     '#f7f7f5',
}

const CAT_COLORS = [C.green, C.purple, C.pink, C.amber]

// ── Helpers ───────────────────────────────────────────────────────────────────
function weekLabel(weekOf) {
  const date    = new Date(weekOf + 'T00:00:00')
  const year    = date.getFullYear()
  const month   = date.getMonth()
  const day     = date.getDate()
  const weekNum = Math.ceil(day / 7)
  const startDay = (weekNum - 1) * 7 + 1
  const endDay   = Math.min(weekNum * 7, new Date(year, month + 1, 0).getDate())
  const ms = date.toLocaleDateString('en-US', { month: 'short' })
  const ml = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return { primary: `Week ${weekNum} of ${ml}`, range: `${ms} ${startDay} – ${ms} ${endDay}`, weekNum }
}

const GRADE_STYLE = {
  A: { bg: '#edf7f3', color: '#1a9e75' },
  B: { bg: '#edf7f3', color: '#1a9e75' },
  C: { bg: '#fdf3e3', color: '#c47c17' },
  D: { bg: '#fdf0ee', color: '#d44f3a' },
  F: { bg: '#fdf0ee', color: '#d44f3a' },
}
function gradeStyle(g) { return GRADE_STYLE[g?.[0]?.toUpperCase()] || GRADE_STYLE.C }

// ── AI Insights Display ────────────────────────────────────────────────────────
function AIInsightsDisplay({ data }) {
  const gs = gradeStyle(data.grade)
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, background:gs.bg, borderRadius:12, padding:'14px 16px', marginBottom:10 }}>
        <div style={{ fontSize:'2rem', fontWeight:700, color:gs.color, fontFamily:"'DM Mono',monospace", lineHeight:1, minWidth:48 }}>
          {data.grade}
        </div>
        <div style={{ fontSize:'0.85rem', lineHeight:1.5 }}>{data.verdict}</div>
      </div>

      {data.overspending?.length > 0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:'0.7rem', fontWeight:600, color:C.text3, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Where it went</div>
          {data.overspending.map((item, i) => (
            <div key={i} style={{ display:'flex', gap:12, padding:'10px 14px', background:'#fdf0ee', borderRadius:8, marginBottom:6 }}>
              <span style={{ fontSize:'1.1rem' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize:'0.8rem', fontWeight:600, marginBottom:2 }}>{item.title}</div>
                <div style={{ fontSize:'0.78rem', color:C.text2, lineHeight:1.5 }}>{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.actions?.length > 0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:'0.7rem', fontWeight:600, color:C.text3, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Next week</div>
          {data.actions.map((item, i) => (
            <div key={i} style={{ display:'flex', gap:12, padding:'10px 14px', background:'#edf7f3', borderRadius:8, marginBottom:6 }}>
              <span style={{ fontSize:'1.1rem' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize:'0.8rem', fontWeight:600, marginBottom:2 }}>{item.title}</div>
                <div style={{ fontSize:'0.78rem', color:C.text2, lineHeight:1.5 }}>{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.projected_savings && (
        <div style={{ padding:'10px 14px', background:'#f0effe', borderRadius:8, marginBottom:8 }}>
          <div style={{ fontSize:'0.7rem', fontWeight:600, color:C.purple, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>💰 Projected savings</div>
          <div style={{ fontSize:'0.82rem', color:'#4a4580', lineHeight:1.5 }}>{data.projected_savings}</div>
        </div>
      )}

      {data.benchmark && (
        <div style={{ padding:'10px 14px', background:'#fdf3e3', borderRadius:8, marginBottom:8 }}>
          <div style={{ fontSize:'0.7rem', fontWeight:600, color:C.amber, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>📊 Benchmark</div>
          <div style={{ fontSize:'0.82rem', color:'#7a5010', lineHeight:1.5 }}>{data.benchmark}</div>
        </div>
      )}

      {data.comparison && (
        <div style={{ padding:'10px 14px', background:'#f0effe', borderRadius:8 }}>
          <span style={{ fontWeight:600, color:C.purple }}>📈 vs. prior weeks  </span>
          <span style={{ fontSize:'0.82rem', color:C.text2, lineHeight:1.5 }}>{data.comparison}</span>
        </div>
      )}
    </div>
  )
}

function AIButton({ prompt }) {
  const [state, setState]   = useState('idle')
  const [parsed, setParsed] = useState(null)
  const [raw, setRaw]       = useState(null)

  const handleClick = async () => {
    setState('loading')
    const text = await getAIInsights(prompt)
    try {
      setParsed(JSON.parse(text.replace(/```json|```/g, '').trim()))
    } catch { setRaw(text) }
    setState('done')
  }

  return (
    <div style={{ marginBottom:14 }}>
      {state !== 'done' && (
        <button className="btn btn-ghost btn-sm" onClick={handleClick} disabled={state === 'loading'} style={{ width:'100%' }}>
          {state === 'loading' ? <><span className="spinner" style={{ marginRight:8 }} /> Analysing…</> : '🤖 Get AI financial plan'}
        </button>
      )}
      {state === 'done' && parsed && <AIInsightsDisplay data={parsed} />}
      {state === 'done' && raw    && <div className="ai-block">{raw}</div>}
    </div>
  )
}

// ── Charts ────────────────────────────────────────────────────────────────────
function BudgetVsActualChart({ week }) {
  const data = [
    { name: '🛒 Groceries', Budget: week.grocery_budget || 0, Actual: week.grocery_spent || 0 },
    { name: '🎉 Fun',       Budget: week.fun_budget     || 0, Actual: week.fun_spent     || 0 },
    ...(week.health_budget || week.health_spent
      ? [{ name: '💊 Health', Budget: week.health_budget || 0, Actual: week.health_spent || 0 }]
      : []),
  ]
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:'0.7rem', fontWeight:600, color:C.text3, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>Budget vs actual</div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barGap={4}>
          <XAxis dataKey="name" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip formatter={v => `$${v.toFixed(2)}`} />
          <Bar dataKey="Budget" fill={C.border} radius={[4,4,0,0]} />
          <Bar dataKey="Actual" radius={[4,4,0,0]}
               fill={C.green}
               label={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.Actual > d.Budget ? C.red : C.green} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function SpendingPieChart({ week }) {
  const raw = [
    { name: 'Groceries', value: week.grocery_spent || 0 },
    { name: 'Fun/Rest',  value: week.fun_spent     || 0 },
    { name: 'Health',    value: week.health_spent  || 0 },
  ].filter(d => d.value > 0)

  if (!raw.length) return null
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:'0.7rem', fontWeight:600, color:C.text3, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>Where it went</div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={raw} dataKey="value" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
            {raw.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={v => `$${v.toFixed(2)}`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function CutToHitBudget({ week }) {
  const cats = [
    { label:'🛒 Groceries', spent: week.grocery_spent||0, budget: week.grocery_budget||0, color:C.green },
    { label:'🎉 Fun/Rest',  spent: week.fun_spent||0,     budget: week.fun_budget||0,     color:C.purple },
    { label:'💊 Health',    spent: week.health_spent||0,  budget: week.health_budget||0,  color:C.pink },
  ].filter(c => c.spent > c.budget)

  if (!cats.length) return (
    <div style={{ padding:'10px 14px', background:'#edf7f3', borderRadius:8, marginBottom:16, fontSize:'0.82rem', color:C.green, fontWeight:500 }}>
      ✅ All categories within budget this week!
    </div>
  )

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:'0.7rem', fontWeight:600, color:C.text3, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>Cut needed to hit budget</div>
      {cats.map((c, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', background:'#fdf0ee', borderRadius:8, marginBottom:6 }}>
          <span style={{ fontSize:'0.82rem', fontWeight:500 }}>{c.label}</span>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.82rem', color:C.red, fontWeight:600 }}>
            −${(c.spent - c.budget).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}

function TrendChart({ weeks }) {
  const data = [...weeks]
    .sort((a, b) => a.week_of.localeCompare(b.week_of))
    .map((w, i) => ({
      name:   `Wk ${i + 1}`,
      Spent:  +(w.total_spent  || 0).toFixed(2),
      Budget: +(w.total_budget || 0).toFixed(2),
    }))

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:'0.7rem', fontWeight:600, color:C.text3, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>Spending trend</div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip formatter={v => `$${v.toFixed(2)}`} />
          <Line type="monotone" dataKey="Budget" stroke={C.border} strokeWidth={2} dot={false} strokeDasharray="4 3" />
          <Line type="monotone" dataKey="Spent"  stroke={C.purple} strokeWidth={2} dot={{ r:4, fill:C.purple }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function MonthlyBarChart({ weeks }) {
  const data = [
    { name: '🛒 Groceries', Budget: weeks.reduce((s,w)=>s+(w.grocery_budget||0),0), Actual: weeks.reduce((s,w)=>s+(w.grocery_spent||0),0) },
    { name: '🎉 Fun',       Budget: weeks.reduce((s,w)=>s+(w.fun_budget||0),0),     Actual: weeks.reduce((s,w)=>s+(w.fun_spent||0),0) },
    { name: '💊 Health',    Budget: weeks.reduce((s,w)=>s+(w.health_budget||0),0),  Actual: weeks.reduce((s,w)=>s+(w.health_spent||0),0) },
  ].filter(d => d.Budget > 0 || d.Actual > 0)

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:'0.7rem', fontWeight:600, color:C.text3, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>Monthly budget vs actual</div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barGap={4}>
          <XAxis dataKey="name" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip formatter={v => `$${v.toFixed(2)}`} />
          <Bar dataKey="Budget" fill={C.border} radius={[4,4,0,0]} />
          <Bar dataKey="Actual" radius={[4,4,0,0]}>
            {data.map((d, i) => <Cell key={i} fill={d.Actual > d.Budget ? C.red : C.green} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Week Card ─────────────────────────────────────────────────────────────────
function WeekCard({ week }) {
  const [open, setOpen] = useState(false)
  const over = week.total_spent > week.total_budget
  const { primary, range } = weekLabel(week.week_of)

  const cats = [
    { key:'groceries', label:'🛒 Groceries', sk:'grocery_spent',  bk:'grocery_budget', color:C.green },
    { key:'fun',       label:'🎉 Fun/Rest',  sk:'fun_spent',      bk:'fun_budget',     color:C.purple },
    { key:'health',    label:'💊 Health',    sk:'health_spent',   bk:'health_budget',  color:C.pink },
  ].filter(c => (week[c.sk]||0) > 0 || (week[c.bk]||0) > 0)

  return (
    <div style={{ marginBottom:8 }}>
      <div className="collapsible-header" onClick={() => setOpen(v => !v)}>
        <div>
          <div style={{ fontSize:'0.85rem', fontWeight:600 }}>{primary}</div>
          <div style={{ fontSize:'0.72rem', color:C.text3, marginTop:1 }}>{range}</div>
          <div style={{ fontSize:'0.75rem', color:C.text3, marginTop:3 }}>
            ${week.total_spent?.toFixed(2)} / ${week.total_budget?.toFixed(2)}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className={`tag ${over ? 'red' : 'green'}`}>{over ? 'Over' : 'Under'}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', color:C.text3 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {open && (
        <div style={{ background:'var(--surface)', border:`1px solid ${C.border}`, borderTop:'none',
                      borderRadius:'0 0 12px 12px', padding:16, marginTop:-8, marginBottom:8 }}>

          {/* AI plan at top */}
          <AIButton prompt={weeklyPrompt(week)} />

          <div style={{ height:1, background:C.border, margin:'12px 0' }} />

          {/* Charts */}
          <BudgetVsActualChart week={week} />
          <SpendingPieChart week={week} />
          <CutToHitBudget week={week} />

          {/* Overall progress */}
          <div style={{ fontSize:'0.7rem', fontWeight:600, color:C.text3, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Overall</div>
          <ProgressBar spent={week.total_spent} budget={week.total_budget} />

          {/* Per-category item breakdown */}
          {cats.map(c => {
            const sp    = week[c.sk] || 0
            const bu    = week[c.bk] || 0
            const items = week[c.key] || []
            const pct   = bu > 0 ? (sp / bu * 100) : 0
            return (
              <div key={c.key} style={{ marginTop:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:'0.825rem', fontWeight:600 }}>{c.label}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.8rem', color:C.text2 }}>
                    ${sp.toFixed(2)} / ${bu.toFixed(2)}
                  </span>
                </div>
                <ProgressBar spent={sp} budget={bu} color={c.color} />
                {items.length > 0 && (
                  <div style={{ marginTop:6 }}>
                    {items.map((it, i) => {
                      const itemPct = bu > 0 ? (it.amount / bu * 100).toFixed(0) : 0
                      return (
                        <div key={i} className="item-row" style={{ padding:'6px 0' }}>
                          <span className="item-name">{it.label}</span>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ fontSize:'0.7rem', fontWeight:500, background:C.bg, borderRadius:99, padding:'2px 7px', color:C.text3 }}>
                              {itemPct}%
                            </span>
                            <span className="item-amount">${it.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      )
                    })}
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderTop:`1px solid ${C.border}`, marginTop:4 }}>
                      <span style={{ fontSize:'0.78rem', color:C.text3, fontWeight:500 }}>Subtotal · {pct.toFixed(0)}% of budget</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.8rem', fontWeight:600 }}>${sp.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Month Block ───────────────────────────────────────────────────────────────
function MonthBlock({ monthStr, weeks }) {
  const ml          = new Date(monthStr + '-02').toLocaleDateString('en-US', { month:'long', year:'numeric' })
  const totalSpent  = weeks.reduce((s,w) => s+(w.total_spent||0),  0)
  const totalBudget = weeks.reduce((s,w) => s+(w.total_budget||0), 0)
  const sorted      = [...weeks].sort((a,b) => a.week_of.localeCompare(b.week_of))
  const best        = sorted.reduce((a,b) => (a.total_spent/a.total_budget||1) < (b.total_spent/b.total_budget||1) ? a : b)
  const worst       = sorted.reduce((a,b) => (a.total_spent/a.total_budget||0) > (b.total_spent/b.total_budget||0) ? a : b)
  const over        = totalSpent > totalBudget

  // Projected savings: if avg weekly spending matched budget, how much extra saved
  const avgSpent    = totalSpent / weeks.length
  const avgBudget   = totalBudget / weeks.length
  const weeksLeft   = 4 - weeks.length
  const projSaved   = weeksLeft > 0 ? (avgBudget - avgSpent) * weeksLeft : 0

  const monthlyCats = [
    { label:'🛒 Groceries', val: weeks.reduce((s,w)=>s+(w.grocery_spent||0),0), bud: weeks.reduce((s,w)=>s+(w.grocery_budget||0),0) },
    { label:'🎉 Fun',       val: weeks.reduce((s,w)=>s+(w.fun_spent||0),0),     bud: weeks.reduce((s,w)=>s+(w.fun_budget||0),0) },
    { label:'💊 Health',    val: weeks.reduce((s,w)=>s+(w.health_spent||0),0),  bud: weeks.reduce((s,w)=>s+(w.health_budget||0),0) },
  ].filter(c => c.val > 0 || c.bud > 0)

  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <h2>{ml}</h2>
          <div style={{ fontSize:'0.75rem', color:C.text3, marginTop:2 }}>{weeks.length} week{weeks.length!==1?'s':''} tracked</div>
        </div>
        <span className={`tag ${over?'red':'green'}`}>{over?'Over budget':'Under budget'}</span>
      </div>

      <div className="card">
        {/* Monthly total */}
        <div className="card-title">Monthly total</div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'1.8rem', fontWeight:500, marginBottom:4 }}>${totalSpent.toFixed(2)}</div>
        <div style={{ fontSize:'0.8rem', color:C.text3, marginBottom:12 }}>of ${totalBudget.toFixed(2)} budget</div>
        <ProgressBar spent={totalSpent} budget={totalBudget} />

        {/* Projected savings callout */}
        {weeksLeft > 0 && (
          <div style={{ padding:'10px 14px', background: projSaved >= 0 ? '#edf7f3' : '#fdf0ee', borderRadius:8, marginTop:12 }}>
            <div style={{ fontSize:'0.7rem', fontWeight:600, color: projSaved >= 0 ? C.green : C.red, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>
              💰 Projected {weeksLeft} week{weeksLeft!==1?'s':''} remaining
            </div>
            <div style={{ fontSize:'0.82rem', color:C.text2 }}>
              {projSaved >= 0
                ? `On track to save an extra $${projSaved.toFixed(2)} if you maintain current pace.`
                : `You'll need to cut $${Math.abs(projSaved).toFixed(2)} over the next ${weeksLeft} week${weeksLeft!==1?'s':''} to hit your monthly budget.`}
            </div>
          </div>
        )}

        {/* Category breakdown */}
        <div style={{ marginTop:14, display:'grid', gridTemplateColumns:`repeat(${monthlyCats.length},1fr)`, gap:8 }}>
          {monthlyCats.map(c => (
            <div key={c.label} className="metric">
              <div className="metric-label">{c.label}</div>
              <div className="metric-value" style={{ fontSize:'0.85rem' }}>${c.val.toFixed(2)}</div>
              <div style={{ fontSize:'0.68rem', color:C.text3 }}>/ ${c.bud.toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Best / worst */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12 }}>
          <div style={{ background:'#edf7f3', borderRadius:8, padding:'10px 12px' }}>
            <div style={{ fontSize:'0.68rem', fontWeight:600, color:C.green, marginBottom:2 }}>🏆 BEST WEEK</div>
            <div style={{ fontSize:'0.78rem', fontWeight:600 }}>{weekLabel(best.week_of).range}</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.78rem', color:C.text2 }}>${best.total_spent?.toFixed(2)}</div>
          </div>
          <div style={{ background:'#fdf0ee', borderRadius:8, padding:'10px 12px' }}>
            <div style={{ fontSize:'0.68rem', fontWeight:600, color:C.red, marginBottom:2 }}>📉 TOUGHEST</div>
            <div style={{ fontSize:'0.78rem', fontWeight:600 }}>{weekLabel(worst.week_of).range}</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.78rem', color:C.text2 }}>${worst.total_spent?.toFixed(2)}</div>
          </div>
        </div>

        {/* Charts */}
        <div style={{ marginTop:16 }}>
          <TrendChart weeks={weeks} />
          <MonthlyBarChart weeks={weeks} />
        </div>

        {/* AI monthly plan */}
        <AIButton prompt={monthlyPrompt(monthStr, weeks)} />
      </div>

      {/* Week cards */}
      <div style={{ marginTop:12 }}>
        <div className="card-title" style={{ marginBottom:8 }}>Weeks</div>
        {[...weeks].sort((a,b) => b.week_of.localeCompare(a.week_of)).map(w => (
          <WeekCard key={w.week_of} week={w} />
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const [history, setHistory] = useState(null)

  useEffect(() => { loadHistory().then(setHistory) }, [])

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

  const byMonth = {}
  for (const w of history) {
    if (!byMonth[w.month]) byMonth[w.month] = []
    byMonth[w.month].push(w)
  }
  const months = Object.keys(byMonth).sort((a,b) => b.localeCompare(a))

  return (
    <div>
      <div style={{ paddingTop:8, marginBottom:20 }}><h1>History</h1></div>
      {months.map(m => (
        byMonth[m].length >= 2
          ? <MonthBlock key={m} monthStr={m} weeks={byMonth[m]} />
          : (
            <div key={m} style={{ marginBottom:24 }}>
              <div style={{ marginBottom:12 }}>
                <h2>{new Date(m+'-02').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</h2>
                <div style={{ fontSize:'0.75rem', color:C.text3, marginTop:2 }}>1 week so far — monthly summary unlocks after 2 weeks</div>
              </div>
              {byMonth[m].map(w => <WeekCard key={w.week_of} week={w} />)}
            </div>
          )
      ))}
    </div>
  )
}

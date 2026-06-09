import { useState } from 'react'
import { toWeekly } from '../lib/supabase.js'

const FREQS  = ['Weekly','Monthly','Annual']
const CATS   = ['Housing','Food','Transport','Health','Entertainment','Savings','Other']

function ExpenseRow({ row, idx, onChange, onDelete }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 90px 80px 28px', gap:6, marginBottom:6, alignItems:'center' }}>
      <input value={row.name} onChange={(e) => onChange(idx,'name',e.target.value)} placeholder="Name"/>
      <input type="number" value={row.amount} onChange={(e) => onChange(idx,'amount',parseFloat(e.target.value)||0)}
             style={{ fontFamily:"'DM Mono',monospace", textAlign:'right' }}/>
      <select value={row.freq} onChange={(e) => onChange(idx,'freq',e.target.value)}>
        {FREQS.map((f) => <option key={f}>{f}</option>)}
      </select>
      <select value={row.cat||'Other'} onChange={(e) => onChange(idx,'cat',e.target.value)}>
        {CATS.map((c) => <option key={c}>{c}</option>)}
      </select>
      <button className="btn-icon" style={{width:26,height:26,fontSize:'0.75rem'}} onClick={() => onDelete(idx)}>✕</button>
    </div>
  )
}

export default function SettingsScreen({ appData, persist, showToast }) {
  const [saving, setSaving] = useState(false)

  const updateIncome = (i, field, val) => {
    const next = appData.income.map((r, idx) => idx === i ? {...r,[field]:val} : r)
    persist({ ...appData, income: next })
  }
  const addIncome = () => persist({ ...appData, income: [...appData.income, { name:'New income', amount:0, freq:'Weekly' }] })
  const delIncome = (i) => persist({ ...appData, income: appData.income.filter((_,idx)=>idx!==i) })

  const updateExp = (i, field, val) => {
    const next = appData.expenses.map((r, idx) => idx === i ? {...r,[field]:val} : r)
    persist({ ...appData, expenses: next })
  }
  const addExp = () => persist({ ...appData, expenses: [...appData.expenses, { name:'New expense', amount:0, freq:'Monthly', cat:'Other' }] })
  const delExp = (i) => persist({ ...appData, expenses: appData.expenses.filter((_,idx)=>idx!==i) })

  const updateLinks = (field, val) => {
    persist({ ...appData, weekly_spend_cats: { ...appData.weekly_spend_cats, [field]: val } })
  }

  const updateGrowth = (field, val) => {
    persist({ ...appData, growth: { ...appData.growth, [field]: val } })
  }

  const expNames = appData.expenses.map((r) => r.name)
  const { weekly_spend_cats: sc, growth: g } = appData

  const totalIncW = appData.income.reduce((s,r)=>s+toWeekly(r.amount,r.freq),0)
  const savW      = appData.expenses.filter((r)=>r.cat==='Savings').reduce((s,r)=>s+toWeekly(r.amount,r.freq),0)

  return (
    <div>
      <div style={{ paddingTop:8, marginBottom:20 }}><h1>Settings</h1></div>

      {/* Income */}
      <div className="card">
        <div className="card-title">Income</div>
        {appData.income.map((row,i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 90px 28px', gap:6, marginBottom:6, alignItems:'center' }}>
            <input value={row.name} onChange={(e)=>updateIncome(i,'name',e.target.value)} placeholder="Name"/>
            <input type="number" value={row.amount} onChange={(e)=>updateIncome(i,'amount',parseFloat(e.target.value)||0)}
                   style={{ fontFamily:"'DM Mono',monospace", textAlign:'right' }}/>
            <select value={row.freq} onChange={(e)=>updateIncome(i,'freq',e.target.value)}>
              {FREQS.map((f)=><option key={f}>{f}</option>)}
            </select>
            <button className="btn-icon" style={{width:26,height:26,fontSize:'0.75rem'}} onClick={()=>delIncome(i)}>✕</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addIncome} style={{marginTop:4}}>+ Add income</button>
      </div>

      {/* Expenses */}
      <div className="card">
        <div className="card-title">Expenses</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 90px 80px 28px', gap:6, marginBottom:8 }}>
          <span style={{ fontSize:'0.7rem', color:'var(--text-3)', fontWeight:500 }}>Name</span>
          <span style={{ fontSize:'0.7rem', color:'var(--text-3)', fontWeight:500 }}>Amount</span>
          <span style={{ fontSize:'0.7rem', color:'var(--text-3)', fontWeight:500 }}>Freq</span>
          <span style={{ fontSize:'0.7rem', color:'var(--text-3)', fontWeight:500 }}>Category</span>
          <span/>
        </div>
        {appData.expenses.map((row,i) => (
          <ExpenseRow key={i} row={row} idx={i} onChange={updateExp} onDelete={delExp} />
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addExp} style={{marginTop:4}}>+ Add expense</button>

        <div className="divider"/>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontSize:'0.8rem', color:'var(--text-2)' }}>Weekly income</span>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.8rem' }}>${totalIncW.toFixed(2)}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
          <span style={{ fontSize:'0.8rem', color:'var(--text-2)' }}>Weekly to savings</span>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.8rem', color:'var(--green)' }}>${savW.toFixed(2)}</span>
        </div>
      </div>

      {/* Category links */}
      <div className="card">
        <div className="card-title">Link weekly categories</div>
        <p style={{ marginBottom:12 }}>Match each tracked category to an expense name above.</p>
        {[
          { label:'🛒 Groceries', field:'groceries_expense_name' },
          { label:'🎉 Fun/Rest',  field:'fun_expense_name' },
          { label:'💊 Health',    field:'health_expense_name' },
        ].map((c) => (
          <div key={c.field} style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:'0.825rem', fontWeight:500 }}>{c.label}</span>
            <select value={sc[c.field]||''} onChange={(e)=>updateLinks(c.field,e.target.value)}>
              {expNames.map((n)=><option key={n}>{n}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Savings & Growth */}
      <div className="card">
        <div className="card-title">Savings & Growth</div>
        {[
          { label:'Emergency fund balance ($)', field:'bal_emer', type:'number' },
          { label:'Savings balance ($)',        field:'bal_sav',  type:'number' },
          { label:'Savings APY (%)',            field:'apy_sav',  type:'number', step:'0.1' },
          { label:'Projection period (years)',  field:'years',    type:'number' },
        ].map((f) => (
          <div key={f.field} style={{ marginBottom:12 }}>
            <label style={{ display:'block', fontSize:'0.78rem', fontWeight:500, color:'var(--text-2)', marginBottom:4 }}>
              {f.label}
            </label>
            <input type={f.type} step={f.step||'1'} value={g[f.field]||0}
                   onChange={(e)=>updateGrowth(f.field, parseFloat(e.target.value)||0)}
                   style={{ fontFamily:"'DM Mono',monospace" }} />
          </div>
        ))}

        {/* Simple growth projection */}
        {(() => {
          let s = g.bal_sav || 0
          const annualSav = savW * 52
          for (let y = 0; y < (g.years||10); y++) s = s * (1+(g.apy_sav||0)/100) + annualSav
          return (
            <div style={{ background:'var(--green-soft)', borderRadius:'var(--radius-sm)', padding:'12px 14px', marginTop:4 }}>
              <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--green)', marginBottom:2 }}>
                IN {g.years||10} YEARS
              </div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'1.3rem', fontWeight:500, color:'var(--green)' }}>
                ${(s + (g.bal_emer||0)).toLocaleString('en-US',{maximumFractionDigits:0})}
              </div>
              <div style={{ fontSize:'0.75rem', color:'var(--green)', opacity:0.8 }}>
                projected total (savings + emergency)
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

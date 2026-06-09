import { useState } from 'react'

const CATS = [
  { key: 'groceries', label: '🛒 Groceries' },
  { key: 'fun',       label: '🎉 Fun/Rest' },
  { key: 'health',    label: '💊 Health' },
]

export default function QuickAdd({ appData, onAdd }) {
  const [cat, setCat]       = useState('groceries')
  const [amount, setAmount] = useState('')
  const [note, setNote]     = useState('')

  const handleAdd = async () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    await onAdd(cat, note.trim() || CATS.find((c) => c.key === cat)?.label, val)
    setAmount('')
    setNote('')
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleAdd() }

  return (
    <div className="quick-add">
      <div className="quick-add-row">
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          style={{ fontSize: '0.825rem' }}
        >
          {CATS.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>

        <input
          type="number"
          inputMode="decimal"
          placeholder="$0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={handleKey}
          style={{ fontFamily: "'DM Mono', monospace", textAlign: 'right' }}
        />

        <input
          type="text"
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleKey}
        />

        <button className="btn btn-primary" onClick={handleAdd}>
          Log
        </button>
      </div>
    </div>
  )
}

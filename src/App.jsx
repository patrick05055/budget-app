import { useState, useEffect, useCallback } from 'react'
import { loadData, saveData, today } from './lib/supabase.js'
import QuickAdd from './components/QuickAdd.jsx'
import BottomNav from './components/BottomNav.jsx'
import Toast from './components/Toast.jsx'
import HomeScreen from './components/HomeScreen.jsx'
import WeeklyScreen from './components/WeeklyScreen.jsx'
import HistoryScreen from './components/HistoryScreen.jsx'
import SettingsScreen from './components/SettingsScreen.jsx'

export default function App() {
  const [screen, setScreen]     = useState('home')
  const [appData, setAppData]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState(null)

  useEffect(() => {
    loadData().then((d) => { setAppData(d); setLoading(false) })
  }, [])

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const persist = useCallback(async (next) => {
    setAppData(next)
    await saveData(next)
  }, [])

  const addEntry = useCallback(async (catKey, label, amount) => {
    if (!appData) return
    const next = {
      ...appData,
      weekly_log: {
        ...appData.weekly_log,
        [catKey]: [
          ...(appData.weekly_log[catKey] || []),
          { label: label || catKey, amount: +amount.toFixed(2) },
        ],
      },
    }
    await persist(next)
    // compute remaining
    const spent = next.weekly_log[catKey].reduce((s, e) => s + e.amount, 0)
    const expName = next.weekly_spend_cats[`${catKey}_expense_name`] || ''
    const exp = next.expenses.find(
      (r) => r.name.trim().toLowerCase() === expName.trim().toLowerCase()
    )
    const budget = exp
      ? exp.freq === 'Weekly' ? exp.amount
        : exp.freq === 'Monthly' ? exp.amount / 4.333
        : exp.amount / 52
      : 0
    const left = budget - spent
    showToast(
      left >= 0
        ? `$${amount.toFixed(2)} logged — $${left.toFixed(2)} left`
        : `$${amount.toFixed(2)} logged — $${Math.abs(left).toFixed(2)} over budget`
    )
  }, [appData, persist, showToast])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh' }}>
      <div className="spinner" />
    </div>
  )

  const screenProps = { appData, persist, showToast }

  return (
    <div className="app-shell">
      {toast && <Toast message={toast} />}

      <div className="page">
        {screen === 'home'     && <HomeScreen    {...screenProps} />}
        {screen === 'weekly'   && <WeeklyScreen  {...screenProps} />}
        {screen === 'history'  && <HistoryScreen {...screenProps} />}
        {screen === 'settings' && <SettingsScreen {...screenProps} />}
      </div>

      <QuickAdd appData={appData} onAdd={addEntry} />
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  )
}

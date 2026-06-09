import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export const DEFAULT_DATA = {
  income: [{ name: 'Salary', amount: 584.80, freq: 'Weekly' }],
  expenses: [
    { name: 'Rent',                   amount: 700.0,  freq: 'Monthly', cat: 'Housing' },
    { name: 'Groceries',              amount: 94.54,  freq: 'Weekly',  cat: 'Food' },
    { name: 'Subscriptions',          amount: 78.97,  freq: 'Monthly', cat: 'Entertainment' },
    { name: 'Gas',                    amount: 100.0,  freq: 'Monthly', cat: 'Transport' },
    { name: 'Fun/Rest',               amount: 117.43, freq: 'Weekly',  cat: 'Entertainment' },
    { name: 'Stock',                  amount: 70.0,   freq: 'Weekly',  cat: 'Savings' },
    { name: 'Saving',                 amount: 100.0,  freq: 'Weekly',  cat: 'Savings' },
    { name: 'Health & Personal Care', amount: 40.0,   freq: 'Weekly',  cat: 'Health' },
  ],
  growth: { bal_emer: 200.0, bal_sav: 0.0, apy_sav: 4.8, years: 10 },
  weekly_log: { week_of: today(), groceries: [], fun: [], health: [] },
  weekly_spend_cats: {
    groceries_expense_name: 'Groceries',
    fun_expense_name: 'Fun/Rest',
    health_expense_name: 'Health & Personal Care',
  },
}

export function today() {
  return new Date().toISOString().split('T')[0]
}

export function toWeekly(amount, freq) {
  if (freq === 'Weekly')  return amount
  if (freq === 'Monthly') return amount / 4.333
  if (freq === 'Annual')  return amount / 52
  return amount
}

export async function loadData() {
  const { data, error } = await supabase
    .from('dashboard_data')
    .select('data')
    .eq('id', 'main')
    .single()
  if (error || !data) return { ...DEFAULT_DATA }
  const saved = data.data
  // backfill missing keys
  for (const key of Object.keys(DEFAULT_DATA)) {
    if (!(key in saved)) saved[key] = DEFAULT_DATA[key]
  }
  if (!saved.weekly_log.health) saved.weekly_log.health = []
  if (!saved.weekly_spend_cats.health_expense_name)
    saved.weekly_spend_cats.health_expense_name = 'Health & Personal Care'
  return saved
}

export async function saveData(payload) {
  await supabase
    .from('dashboard_data')
    .upsert({ id: 'main', data: payload })
}

export async function loadHistory() {
  const { data } = await supabase
    .from('weekly_history')
    .select('*')
    .order('week_of', { ascending: false })
  return data || []
}

export async function archiveWeek(log, expenses, spendCats) {
  const getBudget = (key) => {
    const nameKey = `${key}_expense_name`
    const expName = spendCats[nameKey] || ''
    const exp = expenses.find(
      (r) => r.name.trim().toLowerCase() === expName.trim().toLowerCase()
    )
    return exp ? toWeekly(exp.amount, exp.freq) : 0
  }
  const spends = {
    groceries: (log.groceries || []).reduce((s, e) => s + e.amount, 0),
    fun:       (log.fun       || []).reduce((s, e) => s + e.amount, 0),
    health:    (log.health    || []).reduce((s, e) => s + e.amount, 0),
  }
  const budgets = {
    groceries: getBudget('groceries'),
    fun:       getBudget('fun'),
    health:    getBudget('health'),
  }
  const totalSpent  = Object.values(spends).reduce((a, b) => a + b, 0)
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0)
  const week_of     = log.week_of || today()
  await supabase.from('weekly_history').upsert({
    week_of,
    month:          week_of.slice(0, 7),
    grocery_spent:  +spends.groceries.toFixed(2),
    fun_spent:      +spends.fun.toFixed(2),
    health_spent:   +spends.health.toFixed(2),
    total_spent:    +totalSpent.toFixed(2),
    grocery_budget: +budgets.groceries.toFixed(2),
    fun_budget:     +budgets.fun.toFixed(2),
    health_budget:  +budgets.health.toFixed(2),
    total_budget:   +totalBudget.toFixed(2),
    groceries:      log.groceries || [],
    fun:            log.fun       || [],
    health:         log.health    || [],
  }, { onConflict: 'week_of' })
}

export async function getAIInsights(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const json = await res.json()
  return json.content?.filter((b) => b.type === 'text').map((b) => b.text).join('\n') || 'No response.'
}

export function weeklyPrompt(week) {
  const fmt = (k, label, sk, bk) => {
    const sp = week[sk] || 0
    const bu = week[bk] || 0
    const pct = bu ? (sp / bu * 100).toFixed(1) : 0
    const items = (week[k] || []).map((i) => `${i.label} ($${i.amount.toFixed(2)})`).join(', ') || 'none'
    return `${label}: spent $${sp.toFixed(2)} / $${bu.toFixed(2)} (${pct}%) | items: ${items}`
  }
  return `You are a personal finance analyst. Give detailed, analytical suggestions for this week of spending.

Week of: ${week.week_of}
${fmt('groceries','Groceries','grocery_spent','grocery_budget')}
${fmt('fun','Fun/Rest','fun_spent','fun_budget')}
${fmt('health','Health & Personal Care','health_spent','health_budget')}
Total: $${week.total_spent?.toFixed(2)} / $${week.total_budget?.toFixed(2)} (${week.total_spent > week.total_budget ? 'OVER' : 'under'} budget)

Give 3-5 specific suggestions referencing actual items and amounts. Number each suggestion.`
}

export function monthlyPrompt(monthStr, weeks) {
  const sum = (k) => weeks.reduce((a, w) => a + (w[k] || 0), 0)
  const best  = weeks.reduce((a, b) => (a.total_spent/a.total_budget) < (b.total_spent/b.total_budget) ? a : b)
  const worst = weeks.reduce((a, b) => (a.total_spent/a.total_budget) > (b.total_spent/b.total_budget) ? a : b)
  const wkLines = [...weeks].sort((a,b) => a.week_of.localeCompare(b.week_of))
    .map((w) => `  Week ${w.week_of}: $${w.total_spent?.toFixed(2)} / $${w.total_budget?.toFixed(2)}`).join('\n')
  return `You are a personal finance analyst. Analyse this full calendar month and give detailed, analytical insights.

Month: ${monthStr} | Weeks tracked: ${weeks.length}
Groceries: $${sum('grocery_spent').toFixed(2)} | Fun/Rest: $${sum('fun_spent').toFixed(2)} | Health: $${sum('health_spent').toFixed(2)}
Total: $${sum('total_spent').toFixed(2)} / $${sum('total_budget').toFixed(2)}
Best week: ${best.week_of} | Worst week: ${worst.week_of}
${wkLines}

Give 4-6 analytical insights referencing specific weeks and amounts. End with one concrete goal for next month.`
}

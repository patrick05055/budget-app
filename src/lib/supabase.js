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
  try {
    const res = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const json = await res.json()
    if (json.error) return `Error: ${json.error}`
    return json.text || 'No response.'
  } catch (e) {
    return `Failed to get insights: ${e.message}`
  }
}

export function weeklyPrompt(week) {
  const fmt = (k, label, sk, bk) => {
    const sp = week[sk] || 0
    const bu = week[bk] || 0
    const pct = bu ? (sp / bu * 100).toFixed(1) : 0
    const items = (week[k] || []).map((i) => `${i.label} ($${i.amount.toFixed(2)})`).join(', ') || 'none'
    return `${label}: spent $${sp.toFixed(2)} / $${bu.toFixed(2)} (${pct}%) | items: ${items}`
  }
  return `You are a professional personal finance advisor. Analyse this weekly spending report and respond ONLY with a JSON object — no markdown, no backticks, no preamble.

Week of: ${week.week_of}
${fmt('groceries','Groceries','grocery_spent','grocery_budget')}
${fmt('fun','Fun/Rest','fun_spent','fun_budget')}
${fmt('health','Health & Personal Care','health_spent','health_budget')}
Total: $${week.total_spent?.toFixed(2)} / $${week.total_budget?.toFixed(2)} (${week.total_spent > week.total_budget ? 'OVER' : 'under'} budget)

Return exactly this JSON structure:
{
  "grade": "B+",
  "verdict": "One sentence professional summary of the week.",
  "overspending": [
    { "icon": "🛒", "title": "Category name", "detail": "What went over and why it matters, referencing specific amounts." }
  ],
  "actions": [
    { "icon": "✅", "title": "Action title", "detail": "Specific action to take next week with target amount." }
  ],
  "projected_savings": "If the user follows all 3 actions next week, estimate how much they could save vs this week in one sentence.",
  "benchmark": "Compare their spending to a typical person earning ~$584/week. Be specific with percentages or dollar amounts.",
  "comparison": "One sentence comparing this week to typical spending patterns or prior weeks if data exists."
}

Grade scale: A = under 90% of budget, B = 90-100%, C = 100-120%, D = 120-150%, F = over 150%.
Include 1-3 overspending items (only categories that went over). Include exactly 3 actions.`
}

export function monthlyPrompt(monthStr, weeks) {
  const sum = (k) => weeks.reduce((a, w) => a + (w[k] || 0), 0)
  const best  = weeks.reduce((a, b) => (a.total_spent/a.total_budget) < (b.total_spent/b.total_budget) ? a : b)
  const worst = weeks.reduce((a, b) => (a.total_spent/a.total_budget) > (b.total_spent/b.total_budget) ? a : b)
  const wkLines = [...weeks].sort((a,b) => a.week_of.localeCompare(b.week_of))
    .map((w) => `  Week ${w.week_of}: $${w.total_spent?.toFixed(2)} / $${w.total_budget?.toFixed(2)}`).join('\n')
  return `You are a professional personal finance advisor. Analyse this calendar month and respond ONLY with a JSON object — no markdown, no backticks, no preamble.

Month: ${monthStr} | Weeks tracked: ${weeks.length}
Groceries: $${sum('grocery_spent').toFixed(2)} | Fun/Rest: $${sum('fun_spent').toFixed(2)} | Health: $${sum('health_spent').toFixed(2)}
Total: $${sum('total_spent').toFixed(2)} / $${sum('total_budget').toFixed(2)}
Best week: ${best.week_of} ($${best.total_spent?.toFixed(2)}) | Worst: ${worst.week_of} ($${worst.total_spent?.toFixed(2)})
${wkLines}

Return exactly this JSON structure:
{
  "grade": "B",
  "verdict": "One sentence professional monthly summary.",
  "overspending": [
    { "icon": "🛒", "title": "Category", "detail": "What drove overspending this month with amounts." }
  ],
  "actions": [
    { "icon": "✅", "title": "Action title", "detail": "Specific goal for next month with target amount." }
  ],
  "projected_savings": "Based on this month's patterns, estimate how much they could save next month if they follow the actions. Be specific.",
  "benchmark": "Compare their monthly spending to a typical person earning ~$584/week ($2,532/month). Reference standard budgeting guidelines.",
  "comparison": "One sentence comparing best vs worst week and what drove the difference."
}

Grade scale: A = under 90% of budget, B = 90-100%, C = 100-120%, D = 120-150%, F = over 150%.`
}

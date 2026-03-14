import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  const { data: draftState } = await supabase.from('draft_state').select('*').single()
  if (!draftState) return NextResponse.json({ error: 'No draft state' }, { status: 400 })

  const { data: picks } = await supabase.from('picks').select('*').order('pick_number', { ascending: false })
  if (!picks || picks.length === 0) return NextResponse.json({ error: 'No picks to rollback' }, { status: 400 })

  // Find the highest pick_number and delete all picks at that number (regular + auto-assigned)
  const maxPickNum = picks[0].pick_number
  const toDelete = picks.filter(p => p.pick_number === maxPickNum)
  await supabase.from('picks').delete().eq('pick_number', maxPickNum)

  // Also delete any auto-assigned picks at maxPickNum + 1 (auto picks get +1)
  await supabase.from('picks').delete().eq('pick_number', maxPickNum + 1).eq('auto_assigned', true)

  // Recalculate who should be picking at maxPickNum
  const { data: players } = await supabase.from('players').select('*').order('draft_order')
  const n = players?.length || 4
  const round = Math.floor(maxPickNum / n)
  const pos = maxPickNum % n
  const idx = round % 2 === 0 ? pos : n - 1 - pos
  const nextPlayer = players?.[idx]

  await supabase.from('draft_state').update({
    current_pick_number: maxPickNum,
    current_player_id: nextPlayer?.id ?? null,
    is_complete: false,
  }).eq('id', draftState.id)

  return NextResponse.json({ success: true, rolledBack: toDelete.map(p => p.team_name) })
}

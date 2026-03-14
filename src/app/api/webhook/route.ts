import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TEAMS_2025 } from '@/lib/teams'
import { checkAutoAssign } from '@/lib/draft'
import { notifyDraftPick } from '@/lib/ntfy'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function twimlResponse(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>${message}</Message></Response>`
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const fromPhone = params.get('From') || ''
  const rawText = (params.get('Body') || '').trim()

  // Load players and draft state
  const { data: players } = await supabase.from('players').select('*').order('draft_order')
  const { data: draftState } = await supabase.from('draft_state').select('*').single()
  const { data: picks } = await supabase.from('picks').select('*')

  if (!draftState) return twimlResponse('Draft has not started yet.')
  if (draftState.is_complete) return twimlResponse('The draft is complete!')

  // Find player by phone number
  const normalizePhone = (p: string) => p.replace(/\D/g, '').slice(-10)
  const player = players?.find(p => normalizePhone(p.phone || '') === normalizePhone(fromPhone))

  if (!player) {
    return twimlResponse(`Your number (${fromPhone}) is not registered. Contact the commissioner.`)
  }

  // Check if it's their turn
  if (draftState.current_player_id !== player.id) {
    const currentPicker = players?.find(p => p.id === draftState.current_player_id)
    return twimlResponse(`It's not your turn! Waiting on ${currentPicker?.name || 'someone else'}.`)
  }

  // Find the team by fuzzy name match
  const searchText = rawText.toLowerCase()
  const matchedTeam = TEAMS_2025.find(t =>
    t.name.toLowerCase() === searchText ||
    t.name.toLowerCase().includes(searchText) ||
    searchText.includes(t.name.toLowerCase().split(' ').pop() || '')
  )

  if (!matchedTeam) {
    return twimlResponse(`❌ Couldn't find "${rawText}". Text the team name exactly, e.g. "Duke" or "Michigan State".`)
  }

  // Check not already picked
  const alreadyPicked = picks?.find(p => p.team_name === matchedTeam.name)
  if (alreadyPicked) {
    const pickedByPlayer = players?.find(p => p.id === alreadyPicked.player_id)
    return twimlResponse(`❌ ${matchedTeam.name} was already picked by ${pickedByPlayer?.name || 'someone'}.`)
  }

  // Insert pick
  const { error: pickError } = await supabase.from('picks').insert({
    player_id: player.id,
    team_name: matchedTeam.name,
    seed: matchedTeam.seed,
    pick_number: draftState.current_pick_number,
  })

  if (pickError) return twimlResponse('Error saving pick. Try again.')

  // Reload picks for auto-assign check
  const { data: allPicks } = await supabase.from('picks').select('*')
  const playerOrder = players?.map(p => p.id) || []

  // Auto-assign if 3 of 4 picked for this seed
  let autoAssignMsg = ''
  const autoAssign = checkAutoAssign(matchedTeam.seed, allPicks || [], TEAMS_2025, playerOrder)
  if (autoAssign.shouldAutoAssign && autoAssign.team && autoAssign.playerId) {
    await supabase.from('picks').insert({
      player_id: autoAssign.playerId,
      team_name: autoAssign.team,
      seed: matchedTeam.seed,
      pick_number: draftState.current_pick_number + 1,
      auto_assigned: true,
    })
    const autoPlayer = players?.find(p => p.id === autoAssign.playerId)
    autoAssignMsg = `\n🤖 ${autoPlayer?.name} auto-got ${autoAssign.team}.`
  }

  // Advance draft state — skip players who already have all 16 seeds
  const { data: updatedPicks } = await supabase.from('picks').select('*')
  const isDraftComplete = (updatedPicks?.length || 0) >= 64
  const n = players?.length || 4

  let nextPickNum = draftState.current_pick_number + 1
  let nextPlayer = null
  if (!isDraftComplete) {
    for (let i = 0; i < 64; i++) {
      const round = Math.floor(nextPickNum / n)
      const pos = nextPickNum % n
      const idx = round % 2 === 0 ? pos : n - 1 - pos
      const candidate = players?.[idx]
      if (!candidate) break
      const count = (updatedPicks || []).filter((p: any) => p.player_id === candidate.id).length
      if (count < 16) { nextPlayer = candidate; break }
      nextPickNum++
    }
  }
  const nextPickNumber = nextPickNum

  await supabase.from('draft_state').update({
    current_pick_number: nextPickNumber,
    current_player_id: isDraftComplete ? null : nextPlayer?.id,
    is_complete: isDraftComplete,
  }).eq('id', draftState.id)

  // Send push notification
  const autoAssignCount = autoAssign.shouldAutoAssign && autoAssign.playerId
    ? (updatedPicks || []).filter((p: any) => p.player_id === autoAssign.playerId).length
    : 0
  const autoNotify = autoAssign.shouldAutoAssign && autoAssign.team && autoAssign.playerId
    ? { team: autoAssign.team, playerName: players?.find(p => p.id === autoAssign.playerId)?.name || 'Someone', draftComplete: autoAssignCount >= 16 }
    : undefined
  const pickerCount = (updatedPicks || []).filter((p: any) => p.player_id === player.id).length
  const pickerDraftComplete = pickerCount >= 16
  await notifyDraftPick(player.name, matchedTeam.name, matchedTeam.seed, nextPlayer?.name || '', autoNotify, pickerDraftComplete)

  // Respond to the sender via TwiML
  const confirmMsg = isDraftComplete
    ? `✅ ${matchedTeam.name} locked in! Draft complete! Check the standings.`
    : `✅ ${matchedTeam.name} is yours!${autoAssignMsg}\nUp next: ${nextPlayer?.name}`

  return twimlResponse(confirmMsg)
}

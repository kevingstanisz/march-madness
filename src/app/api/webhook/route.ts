import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TEAMS_2025 } from '@/lib/teams'
import { getSeedForPickIndex, checkAutoAssign } from '@/lib/draft'
import { sendSMS } from '@/lib/twilio'

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

  // Check correct seed line
  const currentSeed = getSeedForPickIndex(draftState.current_pick_number)
  if (matchedTeam.seed !== currentSeed) {
    return twimlResponse(`❌ You must pick a #${currentSeed} seed. ${matchedTeam.name} is a #${matchedTeam.seed} seed.`)
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

  // Advance draft state
  const pickIncrement = autoAssign.shouldAutoAssign ? 2 : 1
  const nextPickNumber = draftState.current_pick_number + pickIncrement
  const isDraftComplete = nextPickNumber >= 64

  const round = Math.floor(nextPickNumber / (players?.length || 4))
  const posInRound = nextPickNumber % (players?.length || 4)
  const nextPlayerIdx = round % 2 === 0 ? posInRound : (players?.length || 4) - 1 - posInRound
  const nextPlayer = players?.[nextPlayerIdx]

  await supabase.from('draft_state').update({
    current_pick_number: nextPickNumber,
    current_player_id: isDraftComplete ? null : nextPlayer?.id,
    is_complete: isDraftComplete,
  }).eq('id', draftState.id)

  // Send SMS to all players
  const phoneNumbers = players?.map(p => p.phone).filter(Boolean) || []
  const nextMsg = isDraftComplete ? 'Draft is complete! 🎉' : `Up next: ${nextPlayer?.name}`
  const broadcastMsg = `🏀 ${player.name} picked ${matchedTeam.name} (#${matchedTeam.seed} seed).${autoAssignMsg}\n${nextMsg}`
  
  // Send to all OTHER players (Twilio auto-responds to sender via TwiML)
  const otherPhones = phoneNumbers.filter(p => {
    const n = (p as string).replace(/\D/g, '').slice(-10)
    return n !== fromPhone.replace(/\D/g, '').slice(-10)
  })
  await Promise.all(otherPhones.map(phone => sendSMS(phone as string, broadcastMsg)))

  // Respond to the sender via TwiML
  const confirmMsg = isDraftComplete
    ? `✅ ${matchedTeam.name} locked in! Draft complete! Check the standings.`
    : `✅ ${matchedTeam.name} is yours!${autoAssignMsg}\n${nextMsg}`

  return twimlResponse(confirmMsg)
}

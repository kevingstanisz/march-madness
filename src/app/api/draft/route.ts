import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyDraftPick } from '@/lib/ntfy'
import { checkAutoAssign } from '@/lib/draft'
import { TEAMS_2025 } from '@/lib/teams'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { playerId, teamName, seed } = await req.json()

  // Validate it's this player's turn
  const { data: draftState } = await supabase
    .from('draft_state')
    .select('*')
    .single()

  if (!draftState) return NextResponse.json({ error: 'Draft not started' }, { status: 400 })
  if (draftState.current_player_id !== playerId) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 403 })
  }

  // Check team is available
  const { data: existingPick } = await supabase
    .from('picks')
    .select('*')
    .eq('team_name', teamName)
    .single()

  if (existingPick) return NextResponse.json({ error: 'Team already picked' }, { status: 400 })

  // Check player doesn't already have a team from this seed
  const { data: playerSeedPick } = await supabase
    .from('picks')
    .select('id')
    .eq('player_id', playerId)
    .eq('seed', seed)
    .single()

  if (playerSeedPick) return NextResponse.json({ error: 'You already have a team from that seed line' }, { status: 400 })

  // Insert pick
  const { error: pickError } = await supabase.from('picks').insert({
    player_id: playerId,
    team_name: teamName,
    seed,
    pick_number: draftState.current_pick_number,
  })

  if (pickError) return NextResponse.json({ error: pickError.message }, { status: 500 })

  // Get all picks to check auto-assign
  const { data: allPicks } = await supabase.from('picks').select('*')
  const { data: players } = await supabase.from('players').select('*').order('draft_order')
  const playerOrder = players?.map((p: any) => p.id) || []
  const playerNames = Object.fromEntries(players?.map((p: any) => [p.id, p.name]) || [])

  // Check auto-assign for this seed
  const autoAssign = checkAutoAssign(seed, allPicks || [], TEAMS_2025, playerOrder)
  if (autoAssign.shouldAutoAssign && autoAssign.team && autoAssign.playerId) {
    await supabase.from('picks').insert({
      player_id: autoAssign.playerId,
      team_name: autoAssign.team,
      seed,
      pick_number: draftState.current_pick_number + 1,
      auto_assigned: true,
    })
  }

  // Advance draft state (auto-assign is free, doesn't use a turn)
  const nextPickNumber = draftState.current_pick_number + 1
  const { data: updatedPicks } = await supabase.from('picks').select('id')
  const isDraftComplete = (updatedPicks?.length || 0) >= 64
  // Snake: even rounds go forward, odd rounds go backward
  const round = Math.floor(nextPickNumber / players!.length)
  const posInRound = nextPickNumber % players!.length
  const nextPlayerIdx = round % 2 === 0 ? posInRound : players!.length - 1 - posInRound
  const nextPlayerId = players?.[nextPlayerIdx]?.id

  await supabase.from('draft_state').update({
    current_pick_number: nextPickNumber,
    current_player_id: isDraftComplete ? null : nextPlayerId,
    is_complete: isDraftComplete,
  }).eq('id', draftState.id)

  // Send push notification
  const pickerName = playerNames[playerId] || 'A player'
  const nextName = nextPlayerId ? playerNames[nextPlayerId] : 'Nobody'
  const autoNotify = autoAssign.shouldAutoAssign && autoAssign.team && autoAssign.playerId
    ? { team: autoAssign.team, playerName: playerNames[autoAssign.playerId] || 'Someone' }
    : undefined
  await notifyDraftPick(pickerName, teamName, seed, nextName, autoNotify)

  return NextResponse.json({ success: true, autoAssigned: autoAssign.shouldAutoAssign })
}

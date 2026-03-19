import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMarchMadnessScores } from '@/lib/espn'
import { TEAMS_2025 } from '@/lib/teams'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Maps ESPN shortDisplayName → our team name in picks
const ESPN_NAME_MAP: Record<string, string> = {
  'Michigan St': 'Michigan State',
  'Ohio St': 'Ohio State',
  'Iowa St': 'Iowa State',
  'Utah St': 'Utah State',
  'Tennessee St': 'Tennessee State',
  'Wright St': 'Wright State',
  'Kennesaw St': 'Kennesaw State',
  'N. Dakota St': 'North Dakota State',
  'North Dakota St': 'North Dakota State',
  'Prairie View': 'Prairie View A&M/Lehigh',
  'Cal Baptist': 'Cal Baptist',
  'Saint Mary\'s': 'Saint Mary\'s',
}

// Resolves an ESPN team name to the pick name stored in our DB.
// Handles: direct match, First Four combined entries (e.g. "SMU" → "Miami (Ohio)/SMU"),
// and known ESPN abbreviation differences.
function resolveTeamName(espnName: string, ourTeamNames: string[]): string {
  // Direct match
  if (ourTeamNames.includes(espnName)) return espnName

  // First Four combined entries: "SMU" → "Miami (Ohio)/SMU"
  const combined = ourTeamNames.find(t =>
    t.includes('/') && t.split('/').some(p => p.trim() === espnName)
  )
  if (combined) return combined

  // Known ESPN name variations
  const mapped = ESPN_NAME_MAP[espnName]
  if (mapped && ourTeamNames.includes(mapped)) return mapped

  return espnName
}

export async function GET() {
  const { data: players } = await supabase.from('players').select('*').order('draft_order')
  const { data: picks } = await supabase.from('picks').select('*')

  const espnGames = await fetchMarchMadnessScores()
  const completedGames = espnGames.filter(g => g.completed && g.winner && g.loser)

  const allPickedTeamNames = [...new Set(picks?.map((p: any) => p.team_name) || [])]

  const standings = players?.map((player: any) => {
    const playerPicks = picks?.filter((p: any) => p.player_id === player.id) || []
    const playerTeams = playerPicks.map((p: any) => p.team_name)

    let points = 0
    const eliminatedTeams: string[] = []

    for (const game of completedGames) {
      const winner = resolveTeamName(game.winner!, allPickedTeamNames)
      const loser = resolveTeamName(game.loser!, allPickedTeamNames)

      if (playerTeams.includes(winner)) {
        const loserTeam = TEAMS_2025.find(t => t.name === loser)
        if (loserTeam) points += 17 - loserTeam.seed
      }
      if (playerTeams.includes(loser) && !eliminatedTeams.includes(loser)) {
        eliminatedTeams.push(loser)
      }
    }

    const teamsRemaining = playerTeams.length - eliminatedTeams.length
    const pointsPossible = points + (teamsRemaining * 8)

    return {
      id: player.id,
      name: player.name,
      points,
      teamsRemaining,
      pointsPossible,
      teams: playerPicks.map((p: any) => ({
        name: p.team_name,
        seed: p.seed,
        eliminated: eliminatedTeams.includes(p.team_name),
        autoAssigned: p.auto_assigned,
      })),
    }
  }) || []

  standings.sort((a, b) => b.points - a.points)
  return NextResponse.json({ standings, gamesTracked: completedGames.length })
}

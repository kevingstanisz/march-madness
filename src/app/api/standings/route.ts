import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMarchMadnessScores } from '@/lib/espn'
import { TEAMS_2025 } from '@/lib/teams'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data: players } = await supabase.from('players').select('*').order('draft_order')
  const { data: picks } = await supabase.from('picks').select('*')

  const espnGames = await fetchMarchMadnessScores()
  const completedGames = espnGames.filter(g => g.completed && g.winner && g.loser)

  const standings = players?.map((player: any) => {
    const playerPicks = picks?.filter((p: any) => p.player_id === player.id) || []
    const playerTeams = playerPicks.map((p: any) => p.team_name)

    let points = 0
    const eliminatedTeams: string[] = []

    for (const game of completedGames) {
      if (playerTeams.includes(game.winner!)) {
        const loserTeam = TEAMS_2025.find(t => t.name === game.loser)
        if (loserTeam) points += 17 - loserTeam.seed
      }
      if (playerTeams.includes(game.loser!)) {
        eliminatedTeams.push(game.loser!)
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

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMarchMadnessScores } from '@/lib/espn'
import { TEAMS_2025 } from '@/lib/teams'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Maps ESPN shortDisplayName → our team name in TEAMS_2025
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
  'N Dakota St': 'North Dakota State',
  'Cal Baptist': 'Cal Baptist',
  'CA Baptist': 'Cal Baptist',
  "Hawai'i": 'Hawaii',
  'Long Island': 'LIU',
  "St John's": "St. John's",
  "Saint Mary's": "Saint Mary's",
}

// Maps every First Four ESPN team name → the combined pick name in our DB.
// Both sides of each matchup are listed so we can detect play-in games and
// look up seeds regardless of who won.
const FIRST_FOUR: Record<string, string> = {
  'Texas':        'Texas/NC State',
  'NC State':     'Texas/NC State',
  'UMBC':         'UMBC/Howard',
  'Howard':       'UMBC/Howard',
  'SMU':          'Miami (Ohio)/SMU',
  'Miami OH':     'Miami (Ohio)/SMU',
  'Prairie View': 'Prairie View A&M/Lehigh',
  'Lehigh':       'Prairie View A&M/Lehigh',
}

// Normalize an ESPN team name to match TEAMS_2025 names
function normalizeEspnName(espnName: string): string {
  return ESPN_NAME_MAP[espnName] || espnName
}

// Max points a team can earn per round, indexed by wins already earned (0=R64, 1=R32, ..., 5=Championship).
// Based on original bracket seeding — assumes the best possible (lowest-seeded) opponent at each stage.
// Bracket pods per region: (1,16,8,9) | (4,13,5,12) | (3,14,6,11) | (2,15,7,10)
// S16: Pod1/2 vs Pod3/4. E8: S16 winners. FF/Champ: cross-region best = 1-seed.
const MAX_PTS_PATH: Record<number, number[]> = {
  //       R64  R32  S16  E8   FF  Champ
  1:  [    1,   9,  13,  15,  16,  16],
  2:  [    2,  10,  14,  16,  16,  16],
  3:  [    3,  11,  15,  16,  16,  16],
  4:  [    4,  12,  16,  15,  16,  16],
  5:  [    5,  13,  16,  15,  16,  16],
  6:  [    6,  14,  15,  16,  16,  16],
  7:  [    7,  15,  14,  16,  16,  16],
  8:  [    8,  16,  13,  15,  16,  16],
  9:  [    9,  16,  13,  15,  16,  16],
  10: [   10,  15,  14,  16,  16,  16],
  11: [   11,  14,  15,  16,  16,  16],
  12: [   12,  13,  16,  15,  16,  16],
  13: [   13,  12,  16,  15,  16,  16],
  14: [   14,  11,  15,  16,  16,  16],
  15: [   15,  10,  14,  16,  16,  16],
  16: [   16,   9,  13,  15,  16,  16],
}

function maxRemainingPoints(seed: number, wins: number): number {
  const path = MAX_PTS_PATH[seed] ?? []
  return path.slice(wins).reduce((sum, pts) => sum + pts, 0)
}

// Build a map of combined pick name → ESPN winner name from completed First Four games
// e.g. "Texas/NC State" → "Texas"
function buildFirstFourResolution(
  completedGames: { winner?: string; loser?: string }[]
): Record<string, string> {
  const resolution: Record<string, string> = {}
  for (const game of completedGames) {
    const w = game.winner!
    const l = game.loser!
    const combinedW = FIRST_FOUR[w]
    const combinedL = FIRST_FOUR[l]
    if (combinedW && combinedW === combinedL) {
      resolution[combinedW] = w
    }
  }
  return resolution
}

export async function GET() {
  const { data: players } = await supabase.from('players').select('*').order('draft_order')
  const { data: picks } = await supabase.from('picks').select('*')

  const espnGames = await fetchMarchMadnessScores()
  const completedGames = espnGames.filter(g => g.completed && g.winner && g.loser)

  // Resolve First Four picks to actual winners (e.g. "Texas/NC State" → "Texas")
  const firstFour = buildFirstFourResolution(completedGames)

  // Skip First Four play-in games themselves (not worth points)
  const scoringGames = completedGames.filter(g => {
    const combinedW = FIRST_FOUR[g.winner!]
    const combinedL = FIRST_FOUR[g.loser!]
    return !(combinedW && combinedW === combinedL)
  })

  const standings = players?.map((player: any) => {
    const playerPicks = picks?.filter((p: any) => p.player_id === player.id) || []

    // Each pick: { pickName (DB), matchName (used to match ESPN winner/loser) }
    const playerTeams = playerPicks.map((p: any) => ({
      pickName: p.team_name as string,
      matchName: normalizeEspnName(firstFour[p.team_name] || p.team_name),
    }))

    let points = 0
    const eliminatedPickNames: string[] = []
    const teamWins: Record<string, { opponent: string; points: number }[]> = {}

    for (const game of scoringGames) {
      const espnWinner = normalizeEspnName(game.winner!)
      const espnLoser = normalizeEspnName(game.loser!)

      const winnerPick = playerTeams.find(t => t.matchName === espnWinner)
      if (winnerPick) {
        const loserTeam = TEAMS_2025.find(t => t.name === espnLoser)
          ?? TEAMS_2025.find(t => t.name === FIRST_FOUR[game.loser!])
        if (loserTeam) {
          const pts = 17 - loserTeam.seed
          points += pts
          if (!teamWins[winnerPick.pickName]) teamWins[winnerPick.pickName] = []
          teamWins[winnerPick.pickName].push({ opponent: espnLoser, points: pts })
        }
      }

      const loserPick = playerTeams.find(t => t.matchName === espnLoser)
      if (loserPick && !eliminatedPickNames.includes(loserPick.pickName)) {
        eliminatedPickNames.push(loserPick.pickName)
      }
    }

    const teamsRemaining = playerTeams.length - eliminatedPickNames.length
    const pointsPossible = points + playerPicks.reduce((sum: number, p: any) => {
      if (eliminatedPickNames.includes(p.team_name)) return sum
      const wins = (teamWins[p.team_name] || []).length
      return sum + maxRemainingPoints(p.seed, wins)
    }, 0)

    return {
      id: player.id,
      name: player.name,
      points,
      teamsRemaining,
      pointsPossible,
      teams: playerPicks.map((p: any) => ({
        // Show resolved winner name instead of combined pick name
        name: firstFour[p.team_name] || p.team_name,
        seed: p.seed,
        eliminated: eliminatedPickNames.includes(p.team_name),
        autoAssigned: p.auto_assigned,
        points: (teamWins[p.team_name] || []).reduce((sum: number, w: any) => sum + w.points, 0),
        wins: teamWins[p.team_name] || [],
      })),
    }
  }) || []

  standings.sort((a, b) => b.points - a.points)
  return NextResponse.json({ standings, gamesTracked: scoringGames.length })
}

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

// Bracket pod per seed (within a region)
function getPod(seed: number): string {
  if ([1,8,9,16].includes(seed)) return 'A'
  if ([4,5,12,13].includes(seed)) return 'B'
  if ([3,6,11,14].includes(seed)) return 'C'
  return 'D' // 2,7,10,15
}

function getHalf(seed: number): string {
  return ['A','B'].includes(getPod(seed)) ? 'top' : 'bottom'
}

// Which round (0=R64..3=E8) two seeds in the SAME region first collide
const R64_PAIRS = [[1,16],[8,9],[5,12],[4,13],[6,11],[3,14],[7,10],[2,15]]
function intraRegionConflictRound(s1: number, s2: number): number {
  if (R64_PAIRS.some(p => p.includes(s1) && p.includes(s2))) return 0
  if (getPod(s1) === getPod(s2)) return 1
  if (getHalf(s1) === getHalf(s2)) return 2
  return 3
}

// Compute max possible additional points for a set of surviving picks,
// accounting for intra-region bracket conflicts (two picks that must face each other).
function computeMaxPossible(
  picks: { seed: number; region: string; wins: number }[]
): number {
  type AlivePick = { seed: number; region: string; wins: number; id: number }
  let alive: AlivePick[] = picks.map((p, i) => ({ ...p, id: i }))
  let total = 0

  for (let round = 0; round < 6; round++) {
    const nextAlive: AlivePick[] = []
    const handled = new Set<number>()

    for (const pick of alive) {
      if (handled.has(pick.id)) continue

      // Pick has already passed this round (wins already counted in `points`)
      if (pick.wins > round) {
        nextAlive.push(pick)
        continue
      }

      // Find another alive pick in the same region that conflicts at this round
      const conflict = alive.find(other =>
        other.id !== pick.id &&
        !handled.has(other.id) &&
        other.region === pick.region &&
        other.wins <= round &&
        intraRegionConflictRound(pick.seed, other.seed) === round
      )

      if (!conflict) {
        total += MAX_PTS_PATH[pick.seed]?.[round] ?? 0
        nextAlive.push(pick)
      } else {
        handled.add(conflict.id)
        // When two picks face each other, the conflict round points are 17 - loser.seed
        // (not the theoretical best-opponent from MAX_PTS_PATH).
        // Compare: pts if pick wins vs pts if conflict wins, then keep the better outcome.
        const ifPickWins    = (17 - conflict.seed) + maxRemainingPoints(pick.seed,     round + 1)
        const ifConflictWins = (17 - pick.seed)    + maxRemainingPoints(conflict.seed, round + 1)
        const winner = ifPickWins >= ifConflictWins ? pick : conflict
        const loser  = winner === pick ? conflict : pick
        total += 17 - loser.seed
        nextAlive.push(winner)
      }
    }

    alive = nextAlive
  }

  return total
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
    const survivingForMax = playerPicks
      .filter((p: any) => !eliminatedPickNames.includes(p.team_name))
      .map((p: any) => ({
        seed: p.seed as number,
        region: TEAMS_2025.find(t => t.name === p.team_name)?.region ?? 'Unknown',
        wins: (teamWins[p.team_name] || []).length,
      }))
    const pointsPossible = points + computeMaxPossible(survivingForMax)

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

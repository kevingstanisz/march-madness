export interface GameResult {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
  completed: boolean
  winner?: string
  loser?: string
  winningSeed?: number
  losingSeed?: number
}

// Tournament starts March 17, 2026 (First Four)
const TOURNAMENT_START_YYYYMMDD = '20260317'

function getTournamentDates(): string[] {
  const dates: string[] = []
  // Use local date to avoid UTC offset shifting the day
  const now = new Date()
  const todayStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

  let d = TOURNAMENT_START_YYYYMMDD
  while (d <= todayStr) {
    dates.push(d)
    // Increment date string
    const dt = new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T12:00:00`)
    dt.setDate(dt.getDate() + 1)
    d = `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`
  }
  return dates
}

function parseEvents(events: any[]): GameResult[] {
  const games: GameResult[] = []
  for (const event of events) {
    const comp = event.competitions?.[0]
    if (!comp) continue
    const home = comp.competitors?.find((c: any) => c.homeAway === 'home')
    const away = comp.competitors?.find((c: any) => c.homeAway === 'away')
    if (!home || !away) continue

    const completed = comp.status?.type?.completed ?? false
    const homeScore = parseInt(home.score || '0')
    const awayScore = parseInt(away.score || '0')

    const homeName = home.team.shortDisplayName || home.team.displayName
    const awayName = away.team.shortDisplayName || away.team.displayName

    let winner, loser
    if (completed) {
      if (homeScore > awayScore) {
        winner = homeName
        loser = awayName
      } else {
        winner = awayName
        loser = homeName
      }
    }

    games.push({
      id: event.id,
      homeTeam: homeName,
      awayTeam: awayName,
      homeScore,
      awayScore,
      status: comp.status?.type?.description || 'Unknown',
      completed,
      winner,
      loser,
    })
  }
  return games
}

export async function fetchMarchMadnessScores(): Promise<GameResult[]> {
  try {
    const dates = getTournamentDates()
    const allGames = new Map<string, GameResult>()

    await Promise.all(dates.map(async (date) => {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&limit=200&dates=${date}`,
        { next: { revalidate: 60 } }
      )
      if (!res.ok) return
      const data = await res.json()
      for (const game of parseEvents(data.events || [])) {
        allGames.set(game.id, game)
      }
    }))

    return Array.from(allGames.values())
  } catch (err) {
    console.error('ESPN fetch error:', err)
    return []
  }
}

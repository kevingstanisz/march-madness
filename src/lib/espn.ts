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

export async function fetchMarchMadnessScores(): Promise<GameResult[]> {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&limit=200',
      { next: { revalidate: 60 } }
    )
    if (!res.ok) throw new Error('ESPN API failed')
    const data = await res.json()

    const games: GameResult[] = []
    for (const event of data.events || []) {
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
  } catch (err) {
    console.error('ESPN fetch error:', err)
    return []
  }
}

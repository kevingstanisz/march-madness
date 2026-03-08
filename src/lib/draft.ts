export const TOTAL_PLAYERS = 4
export const SEEDS = Array.from({ length: 16 }, (_, i) => i + 1)

/**
 * Snake draft order for 4 players, 16 seed lines = 64 picks
 * Round 1: 1,2,3,4 | Round 2: 4,3,2,1 | Round 3: 1,2,3,4 ...
 */
export function getSnakeDraftOrder(playerOrder: string[]): string[] {
  const order: string[] = []
  for (let seed = 0; seed < 16; seed++) {
    if (seed % 2 === 0) {
      order.push(...playerOrder)
    } else {
      order.push(...[...playerOrder].reverse())
    }
  }
  return order
}

/**
 * Given a seed line and existing picks, returns teams not yet picked for that seed
 */
export function getAvailableTeamsForSeed(
  seed: number,
  allTeams: { name: string; seed: number }[],
  picks: { team_name: string; seed: number }[]
) {
  const teamsForSeed = allTeams.filter(t => t.seed === seed)
  const pickedForSeed = picks.filter(p => p.seed === seed).map(p => p.team_name)
  return teamsForSeed.filter(t => !pickedForSeed.includes(t.name))
}

/**
 * Check if a seed line has 3 picks — auto-assign remaining team
 */
export function checkAutoAssign(
  seed: number,
  picks: { team_name: string; seed: number; player_id: string }[],
  allTeams: { name: string; seed: number }[],
  playerOrder: string[]
): { shouldAutoAssign: boolean; team?: string; playerId?: string } {
  const picksForSeed = picks.filter(p => p.seed === seed)
  if (picksForSeed.length !== 3) return { shouldAutoAssign: false }

  const teamsForSeed = allTeams.filter(t => t.seed === seed)
  const pickedTeams = picksForSeed.map(p => p.team_name)
  const remainingTeam = teamsForSeed.find(t => !pickedTeams.includes(t.name))
  if (!remainingTeam) return { shouldAutoAssign: false }

  const pickedPlayerIds = picksForSeed.map(p => p.player_id)
  const remainingPlayer = playerOrder.find(pid => !pickedPlayerIds.includes(pid))
  if (!remainingPlayer) return { shouldAutoAssign: false }

  return { shouldAutoAssign: true, team: remainingTeam.name, playerId: remainingPlayer }
}

'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { TEAMS_2025 } from '@/lib/teams'
import { getSeedForPickIndex } from '@/lib/draft'
import Link from 'next/link'

interface Player { id: string; name: string; draft_order: number }
interface Pick { player_id: string; team_name: string; seed: number; pick_number: number; auto_assigned?: boolean }
interface DraftState { current_player_id: string | null; current_pick_number: number; is_complete: boolean }
interface Standing { id: string; name: string; points: number; teamsRemaining: number; pointsPossible: number; teams: { name: string; seed: number; eliminated: boolean }[] }

export default function HomePage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [draftState, setDraftState] = useState<DraftState | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [activeTab, setActiveTab] = useState<'draft' | 'standings'>('draft')
  const [activeSeed, setActiveSeed] = useState(1)
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    const [{ data: allPlayers }, { data: pickData }, { data: stateData }] = await Promise.all([
      supabase.from('players').select('id, name, draft_order').order('draft_order'),
      supabase.from('picks').select('*').order('pick_number'),
      supabase.from('draft_state').select('*').single(),
    ])
    setPlayers(allPlayers || [])
    setPicks(pickData || [])
    setDraftState(stateData)
    if (stateData) setActiveSeed(getSeedForPickIndex(stateData.current_pick_number))
    setLoading(false)
  }, [])

  const loadStandings = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    const res = await fetch('/api/standings')
    const data = await res.json()
    setStandings(data.standings || [])
    setLastUpdated(new Date())
    if (showRefresh) setRefreshing(false)
  }, [])

  useEffect(() => {
    loadData()
    loadStandings()
    const channel = supabase.channel('public-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'picks' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_state' }, loadData)
      .subscribe()
    const interval = setInterval(() => loadStandings(), 60000)
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [loadData, loadStandings])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="pulse font-display text-4xl tracking-wide" style={{ color: 'var(--accent)' }}>LOADING...</div>
    </div>
  )

  const currentSeed = draftState ? getSeedForPickIndex(draftState.current_pick_number) : 1
  const currentPicker = players.find(p => p.id === draftState?.current_player_id)
  const playerPickMap: Record<string, Pick[]> = {}
  players.forEach(p => { playerPickMap[p.id] = picks.filter(pk => pk.player_id === p.id) })
  const teamsForSeed = TEAMS_2025.filter(t => t.seed === activeSeed)
  const pickedForSeed = picks.filter(p => p.seed === activeSeed)

  return (
    <div className="min-h-screen">
      <header style={{ borderBottom: '1px solid var(--net)', background: 'var(--hardwood)' }} className="sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏀</span>
            <span className="font-display text-2xl tracking-wide" style={{ color: 'var(--accent)' }}>MARCH MADNESS</span>
          </div>
          <Link href="/admin/login" className="btn-ghost text-xs py-1 px-3">Admin</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="card mb-6 slide-in">
          {!draftState ? (
            <p className="text-center" style={{ color: 'rgba(240,237,232,0.5)' }}>Draft hasn't started yet.</p>
          ) : draftState.is_complete ? (
            <div className="text-center py-1">
              <span className="font-display text-3xl tracking-wide" style={{ color: 'var(--gold)' }}>🏆 DRAFT COMPLETE</span>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(240,237,232,0.5)' }}>On The Clock</p>
                <p className="font-display text-3xl tracking-wide" style={{ color: 'var(--gold)' }}>⚡ {currentPicker?.name?.toUpperCase() || '...'}</p>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(240,237,232,0.5)' }}>Text your pick · Seed #{currentSeed}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(240,237,232,0.5)' }}>Pick</p>
                <p className="font-display text-4xl" style={{ color: 'var(--accent)' }}>#{draftState.current_pick_number + 1}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--net)' }}>
          {(['draft', 'standings'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="font-display text-lg tracking-wide px-4 py-2 transition-colors"
              style={{ color: activeTab === tab ? 'var(--accent)' : 'rgba(240,237,232,0.4)', borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1 }}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {activeTab === 'draft' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(240,237,232,0.5)' }}>Seed Lines</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 16 }, (_, i) => i + 1).map(seed => {
                    const complete = picks.filter(p => p.seed === seed).length === 4
                    const isCurrent = seed === currentSeed && !draftState?.is_complete
                    return (
                      <button key={seed} onClick={() => setActiveSeed(seed)}
                        className="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                        style={{ background: activeSeed === seed ? 'var(--accent)' : complete ? 'rgba(245,166,35,0.2)' : 'rgba(255,255,255,0.07)', color: activeSeed === seed ? 'white' : complete ? 'var(--gold)' : 'var(--chalk)', border: isCurrent ? '2px solid var(--gold)' : '2px solid transparent' }}>
                        {seed}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl tracking-wide">SEED #{activeSeed}</h2>
                  <span className="text-sm" style={{ color: 'rgba(240,237,232,0.5)' }}>{pickedForSeed.length}/4 picked</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {teamsForSeed.map(team => {
                    const pick = pickedForSeed.find(p => p.team_name === team.name)
                    const pickedBy = pick ? players.find(p => p.id === pick.player_id) : null
                    return (
                      <div key={team.name} className={`team-card ${pick ? 'taken' : ''}`} style={{ cursor: 'default' }}>
                        <div className="seed-badge" style={{ background: pick ? 'rgba(255,255,255,0.15)' : undefined }}>{team.seed}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{team.name}</p>
                          <p className="text-xs" style={{ color: 'rgba(240,237,232,0.4)' }}>{team.region}</p>
                        </div>
                        {pickedBy && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(240,237,232,0.6)' }}>
                            {pickedBy.name}{pick?.auto_assigned ? ' (auto)' : ''}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {players.map(p => {
                const myPicks = playerPickMap[p.id] || []
                const isActive = p.id === draftState?.current_player_id
                return (
                  <div key={p.id} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display text-lg tracking-wide" style={{ color: isActive ? 'var(--gold)' : 'var(--chalk)' }}>
                        {isActive && '⚡ '}{p.name.toUpperCase()}
                      </h3>
                      <span className="text-xs" style={{ color: 'rgba(240,237,232,0.4)' }}>{myPicks.length} picks</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {myPicks.sort((a, b) => a.seed - b.seed).map(pick => (
                        <div key={pick.team_name} className="flex items-center gap-2 text-sm">
                          <div className="seed-badge" style={{ width: 22, height: 22, fontSize: '0.65rem' }}>{pick.seed}</div>
                          <span className="truncate">{pick.team_name}</span>
                        </div>
                      ))}
                      {myPicks.length === 0 && <p className="text-xs" style={{ color: 'rgba(240,237,232,0.3)' }}>No picks yet</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'standings' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm" style={{ color: 'rgba(240,237,232,0.4)' }}>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ''}</p>
              <button onClick={() => loadStandings(true)} className="btn-ghost text-sm" disabled={refreshing}>{refreshing ? '↻ ...' : '↻ Refresh'}</button>
            </div>

            <div className="standing-row mb-1">
              {['#', 'Player', 'Pts', 'Max', 'Left'].map((h, i) => (
                <span key={h} className="text-xs uppercase tracking-widest" style={{ color: 'rgba(240,237,232,0.4)', textAlign: i > 1 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>

            <div className="card p-0 overflow-hidden">
              {standings.length === 0 ? (
                <div className="p-6 text-center" style={{ color: 'rgba(240,237,232,0.4)' }}>Standings appear once tournament begins</div>
              ) : standings.map((s, i) => (
                <div key={s.id}>
                  <div className={`standing-row cursor-pointer hover:bg-white/5 transition-colors ${i === 0 ? 'leader' : ''}`}
                    onClick={() => setExpandedPlayer(expandedPlayer === s.id ? null : s.id)}>
                    <span className="font-display text-xl" style={{ color: i === 0 ? 'var(--gold)' : 'rgba(240,237,232,0.4)' }}>{i === 0 ? '🏆' : i + 1}</span>
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(240,237,232,0.4)' }}>{s.teamsRemaining} teams alive</p>
                    </div>
                    <span className="font-display text-2xl text-right" style={{ color: i === 0 ? 'var(--gold)' : 'var(--chalk)' }}>{s.points}</span>
                    <span className="text-right text-sm" style={{ color: 'rgba(240,237,232,0.5)' }}>{s.pointsPossible}</span>
                    <span className="text-right text-sm" style={{ color: 'rgba(240,237,232,0.5)' }}>{s.teamsRemaining}</span>
                  </div>
                  {expandedPlayer === s.id && (
                    <div className="px-4 pb-4 slide-in" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <p className="text-xs uppercase tracking-widest mb-2 pt-3" style={{ color: 'rgba(240,237,232,0.4)' }}>Teams</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {s.teams.sort((a, b) => a.seed - b.seed).map(team => (
                          <div key={team.name} className="flex items-center gap-2" style={{ opacity: team.eliminated ? 0.35 : 1 }}>
                            <div className="seed-badge" style={{ width: 22, height: 22, fontSize: '0.65rem', background: team.eliminated ? 'rgba(255,255,255,0.15)' : undefined }}>{team.seed}</div>
                            <span className="text-xs truncate" style={{ textDecoration: team.eliminated ? 'line-through' : 'none' }}>{team.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="card mt-6">
              <h3 className="font-display text-lg tracking-wide mb-2">SCORING</h3>
              <p className="text-sm mb-3" style={{ color: 'rgba(240,237,232,0.6)' }}>Points = 17 − seed of team beaten. Upsets score more.</p>
              <div className="flex gap-3 flex-wrap">
                {[[1,16],[4,13],[8,9],[12,5],[16,1]].map(([w,l]) => (
                  <div key={w} className="text-center px-3 py-2 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-xs mb-0.5" style={{ color: 'rgba(240,237,232,0.4)' }}>#{w} beats #{l}</p>
                    <p className="font-display text-xl" style={{ color: 'var(--accent)' }}>{17 - l} pts</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

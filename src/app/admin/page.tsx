'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TEAMS_2025 } from '@/lib/teams'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [picks, setPicks] = useState<any[]>([])
  const [draftState, setDraftState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin/login'); return }
      const { data: playerData } = await supabase.from('players').select('is_admin').eq('email', user.email).single()
      if (!playerData?.is_admin) { router.push('/admin/login'); return }
      const [{ data: allPlayers }, { data: pickData }, { data: stateData }] = await Promise.all([
        supabase.from('players').select('*').order('draft_order'),
        supabase.from('picks').select('*').order('pick_number'),
        supabase.from('draft_state').select('*').single(),
      ])
      setPlayers(allPlayers || [])
      setPicks(pickData || [])
      setDraftState(stateData)
      setLoading(false)
    }
    load()
  }, [router])

  async function startDraft() {
    const playerOrder = players.map(p => p.id)
    const { error } = await supabase.from('draft_state').insert({
      current_pick_number: 0,
      current_player_id: playerOrder[0],
      is_complete: false,
      player_order: playerOrder,
    })
    if (!error) {
      const { data } = await supabase.from('draft_state').select('*').single()
      setDraftState(data)
      setMsg('✓ Draft started! Players can now text their picks.')
    } else {
      setMsg(error.message)
    }
  }

  async function resetDraft() {
    if (!confirm('Are you sure? This deletes ALL picks and resets the draft.')) return
    await supabase.from('picks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('draft_state').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setDraftState(null)
    setPicks([])
    setMsg('Draft reset.')
  }

  async function makePick() {
    if (!selectedTeam || !draftState) return
    setSubmitting(true)
    setMsg('')
    const team = TEAMS_2025.find(t => t.name === selectedTeam)
    if (!team) { setSubmitting(false); return }
    const res = await fetch('/api/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: draftState.current_player_id, teamName: selectedTeam, seed: team.seed }),
    })
    const data = await res.json()
    if (data.error) {
      setMsg(`❌ ${data.error}`)
    } else {
      setMsg(`✓ Picked ${selectedTeam}${data.autoAssigned ? ' (+ auto-assign)' : ''}`)
      setSelectedTeam('')
      const [{ data: pickData }, { data: stateData }] = await Promise.all([
        supabase.from('picks').select('*').order('pick_number'),
        supabase.from('draft_state').select('*').single(),
      ])
      setPicks(pickData || [])
      setDraftState(stateData)
    }
    setSubmitting(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="pulse font-display text-3xl" style={{ color: 'var(--accent)' }}>LOADING...</div>
    </div>
  )

  const currentPicker = players.find(p => p.id === draftState?.current_player_id)
  const availableTeams = TEAMS_2025.filter(t => !picks.find(p => p.team_name === t.name)).sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen">
      <header style={{ borderBottom: '1px solid var(--net)', background: 'var(--hardwood)' }} className="sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs" style={{ color: 'rgba(240,237,232,0.4)' }}>← Public Site</Link>
            <span className="font-display text-xl tracking-wide" style={{ color: 'var(--accent)' }}>ADMIN PANEL</span>
          </div>
          <button onClick={signOut} className="btn-ghost text-xs py-1 px-3">Sign Out</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="card">
          <h2 className="font-display text-xl tracking-wide mb-4">DRAFT CONTROL</h2>
          {!draftState ? (
            <div>
              <p className="text-sm mb-4" style={{ color: 'rgba(240,237,232,0.6)' }}>Players & draft order (edit draft_order in Supabase to change):</p>
              <div className="flex flex-col gap-2 mb-4">
                {players.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="text-xs w-4" style={{ color: 'rgba(240,237,232,0.4)' }}>{i + 1}</span>
                    <span>{p.name}</span>
                    <span className="text-xs ml-auto" style={{ color: 'rgba(240,237,232,0.4)' }}>{p.phone || 'No phone'}</span>
                  </div>
                ))}
              </div>
              <button onClick={startDraft} className="btn-primary">START DRAFT</button>
              {msg && <p className="mt-3 text-sm" style={{ color: 'var(--gold)' }}>{msg}</p>}
            </div>
          ) : draftState.is_complete ? (
            <div className="flex items-center justify-between">
              <p style={{ color: 'var(--gold)' }}>🏆 Draft complete!</p>
              <button onClick={resetDraft} className="btn-ghost text-xs" style={{ color: 'var(--accent)' }}>Reset Draft</button>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(240,237,232,0.5)' }}>On The Clock</p>
                <p className="font-display text-2xl" style={{ color: 'var(--gold)' }}>{currentPicker?.name}</p>
                <p className="text-sm" style={{ color: 'rgba(240,237,232,0.5)' }}>Pick #{draftState.current_pick_number + 1}</p>
              </div>
              <button onClick={resetDraft} className="btn-ghost text-xs" style={{ color: 'var(--accent)' }}>Reset Draft</button>
            </div>
          )}
        </div>

        {draftState && !draftState.is_complete && (
          <div className="card">
            <h2 className="font-display text-xl tracking-wide mb-1">MAKE PICK (BACKUP)</h2>
            <p className="text-sm mb-4" style={{ color: 'rgba(240,237,232,0.5)' }}>
              Use if a player can't text. Picking for: <strong style={{ color: 'var(--gold)' }}>{currentPicker?.name}</strong>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {availableTeams.map(team => (
                <div key={team.name} onClick={() => setSelectedTeam(selectedTeam === team.name ? '' : team.name)}
                  className={`team-card ${selectedTeam === team.name ? 'selected' : ''}`}>
                  <div className="seed-badge">{team.seed}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{team.name}</p>
                    <p className="text-xs" style={{ color: 'rgba(240,237,232,0.4)' }}>{team.region}</p>
                  </div>
                  {selectedTeam === team.name && <span style={{ color: 'var(--accent)' }}>✓</span>}
                </div>
              ))}
            </div>
            <button onClick={makePick} disabled={!selectedTeam || submitting} className="btn-primary">
              {submitting ? 'SUBMITTING...' : selectedTeam ? `PICK ${selectedTeam.toUpperCase()}` : 'SELECT A TEAM'}
            </button>
            {msg && <p className="mt-3 text-sm" style={{ color: msg.startsWith('✓') ? 'var(--gold)' : 'var(--accent)' }}>{msg}</p>}
          </div>
        )}

        <div className="card">
          <h2 className="font-display text-xl tracking-wide mb-3">TWILIO WEBHOOK</h2>
          <p className="text-sm mb-2" style={{ color: 'rgba(240,237,232,0.6)' }}>Set this as your Twilio number's incoming message webhook:</p>
          <div className="p-3 rounded font-mono text-sm" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--gold)' }}>
            https://YOUR-APP.vercel.app/api/webhook
          </div>
          <p className="text-xs mt-2" style={{ color: 'rgba(240,237,232,0.4)' }}>
            Twilio Console → Phone Numbers → Active Numbers → your number → Messaging → Webhook URL (HTTP POST)
          </p>
        </div>

        <div className="card">
          <h2 className="font-display text-xl tracking-wide mb-4">ALL PICKS ({picks.length}/64)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {players.map(p => (
              <div key={p.id}>
                <p className="font-display text-lg tracking-wide mb-2" style={{ color: 'var(--accent)' }}>{p.name}</p>
                <div className="flex flex-col gap-1">
                  {picks.filter(pk => pk.player_id === p.id).sort((a, b) => a.seed - b.seed).map(pick => (
                    <div key={pick.team_name} className="flex items-center gap-2 text-sm">
                      <div className="seed-badge" style={{ width: 22, height: 22, fontSize: '0.65rem' }}>{pick.seed}</div>
                      <span>{pick.team_name}</span>
                      {pick.auto_assigned && <span className="text-xs" style={{ color: 'rgba(240,237,232,0.3)' }}>auto</span>}
                    </div>
                  ))}
                  {picks.filter(pk => pk.player_id === p.id).length === 0 && (
                    <p className="text-xs" style={{ color: 'rgba(240,237,232,0.3)' }}>No picks yet</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

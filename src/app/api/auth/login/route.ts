import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const { data: player } = await supabase
    .from('players')
    .select('id, name')
    .eq('username', username)
    .eq('password', password)
    .single()

  if (!player) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true, name: player.name })
  res.cookies.set('player_id', player.id, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 })
  return res
}

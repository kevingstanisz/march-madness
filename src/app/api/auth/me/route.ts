import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const playerId = req.cookies.get('player_id')?.value
  if (!playerId) return NextResponse.json({ player: null })

  const { data: player } = await supabase
    .from('players')
    .select('id, name')
    .eq('id', playerId)
    .single()

  return NextResponse.json({ player: player || null })
}

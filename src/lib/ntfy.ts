export async function notifyDraftPick(
  playerName: string,
  teamName: string,
  seed: number,
  nextPlayerName: string,
  autoAssign?: { team: string; playerName: string; draftComplete?: boolean },
  pickerDraftComplete?: boolean
) {
  const topic = process.env.NTFY_TOPIC
  if (!topic) {
    console.warn('NTFY_TOPIC not configured, skipping notification')
    return
  }

  const isDraftComplete = !nextPlayerName || nextPlayerName === 'Nobody'
  const autoMsg = autoAssign
    ? ` | Auto: ${autoAssign.playerName} gets ${autoAssign.team}${autoAssign.draftComplete ? ` (${autoAssign.playerName}'s draft is full!)` : ''}`
    : ''
  const pickerCompleteMsg = pickerDraftComplete && !isDraftComplete ? ` | ${playerName}'s draft is full!` : ''
  const message = isDraftComplete
    ? `${playerName} picked ${teamName} (#${seed} seed).${autoMsg} Draft complete! Good luck losers.`
    : `${playerName} picked ${teamName} (#${seed} seed).${autoMsg}${pickerCompleteMsg} Up next: ${nextPlayerName}`

  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Title': 'March Madness Draft',
        'Priority': 'default',
        'Content-Type': 'text/plain',
      },
      body: message,
    })
  } catch (err) {
    console.error('ntfy error:', err)
  }
}

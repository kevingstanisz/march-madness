export async function notifyDraftPick(
  playerName: string,
  teamName: string,
  seed: number,
  nextPlayerName: string
) {
  const topic = process.env.NTFY_TOPIC
  if (!topic) {
    console.warn('NTFY_TOPIC not configured, skipping notification')
    return
  }

  const isDraftComplete = !nextPlayerName || nextPlayerName === 'Nobody'
  const message = isDraftComplete
    ? `${playerName} picked ${teamName} (#${seed} seed). Draft complete! 🎉`
    : `${playerName} picked ${teamName} (#${seed} seed). Up next: ${nextPlayerName}`

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

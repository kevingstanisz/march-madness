export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !from) {
      console.warn('Twilio not configured, skipping SMS')
      return false
    }

    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({ To: to, From: from, Body: message }),
      }
    )
    return res.ok
  } catch (err) {
    console.error('SMS error:', err)
    return false
  }
}

export async function notifyDraftPick(
  playerName: string,
  teamName: string,
  seed: number,
  nextPlayerName: string,
  phoneNumbers: string[]
) {
  const message = `🏀 March Madness Draft\n${playerName} picked ${teamName} (${seed} seed).\n${nextPlayerName ? `Up next: ${nextPlayerName}` : 'Draft complete!'}`
  await Promise.all(phoneNumbers.map(phone => sendSMS(phone, message)))
}

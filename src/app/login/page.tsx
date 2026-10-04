'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      window.location.href = '/'
      return
    }
    setError(
      res.status === 429
        ? 'Too many tries. Wait a bit and try again.'
        : 'Wrong password, sweetie.',
    )
    setBusy(false)
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="awning" aria-hidden />
      <div className="flex flex-1 items-center justify-center p-4">
        <form
          onSubmit={submit}
          className="mom-note flex w-full max-w-sm flex-col gap-4 rounded-3xl p-7"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              aria-hidden
              className="bg-accent border-primary/40 flex size-16 items-center justify-center rounded-full border-2 border-dashed text-3xl"
            >
              🍝
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Restaurant<span className="text-primary">Mom</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Say the magic word, sweetie.
            </p>
          </div>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-primary/30 bg-background focus:border-primary rounded-xl border-2 px-3.5 py-2.5 outline-none"
          />
          {error && <p className="text-destructive text-center text-sm">{error}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="bg-primary text-primary-foreground hover:bg-[var(--tomato-deep)] rounded-xl px-3 py-2.5 font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Come in'}
          </button>
        </form>
      </div>
    </main>
  )
}

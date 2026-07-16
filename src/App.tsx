import { useState } from 'react'

// What the Nitro /api/preview route returns. The browser CANNOT produce this
// itself — CORS blocks fetching arbitrary third-party pages from the client —
// so every field here is proof the backend did the work on our behalf.
type Preview = {
  url: string
  finalUrl: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
  elapsedMs: number
  fetchedBy: string
}

const SAMPLES = [
  'https://vercel.com',
  'https://github.com/nitrojs/nitro',
  'https://react.dev',
]

export function App() {
  const [url, setUrl] = useState('https://vercel.com')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function scrape(target: string) {
    setLoading(true)
    setError(null)
    setPreview(null)
    try {
      // Same-origin call. In dev, turbopack's server proxies /api → Nitro (:3001);
      // in prod, Nitro serves this built frontend AND /api from one origin.
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Server returned ${res.status}`)
      setPreview(data as Preview)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="wrap">
      <header>
        <h1>Link Preview</h1>
        <p className="lead">
          Paste any URL. Your browser can't fetch it directly (CORS blocks
          cross-origin reads) — so the <strong>Nitro backend</strong> fetches
          the page, extracts its Open Graph metadata, and hands the card back to
          this <strong>turbopack</strong>-built frontend.
        </p>
      </header>

      <form
        className="bar"
        onSubmit={(e) => {
          e.preventDefault()
          if (url.trim()) scrape(url.trim())
        }}
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          spellCheck={false}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Fetching…' : 'Preview'}
        </button>
      </form>

      <div className="samples">
        <span>Try:</span>
        {SAMPLES.map((s) => (
          <button
            key={s}
            className="chip"
            onClick={() => {
              setUrl(s)
              scrape(s)
            }}
            disabled={loading}
          >
            {s.replace(/^https?:\/\//, '')}
          </button>
        ))}
      </div>

      {error && (
        <div className="card error">
          <strong>Couldn't fetch that.</strong>
          <span>{error}</span>
        </div>
      )}

      {preview && (
        <article className="card preview">
          {preview.image && (
            <div className="thumb">
              <img src={preview.image} alt="" />
            </div>
          )}
          <div className="body">
            <div className="site">
              {preview.favicon && <img src={preview.favicon} alt="" />}
              <span>{preview.siteName || new URL(preview.finalUrl).hostname}</span>
            </div>
            <h2>{preview.title || preview.finalUrl}</h2>
            {preview.description && <p>{preview.description}</p>}
            <a href={preview.finalUrl} target="_blank" rel="noreferrer">
              {preview.finalUrl}
            </a>
          </div>
          <footer className="proof">
            🛰 Fetched server-side by {preview.fetchedBy} in {preview.elapsedMs}ms
          </footer>
        </article>
      )}
    </main>
  )
}

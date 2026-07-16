// POST /api/preview  { url }  →  { title, description, image, siteName, ... }
//
// This is the whole point of the demo: a browser CANNOT fetch an arbitrary
// third-party page (CORS blocks cross-origin reads), so it delegates to this
// Nitro route, which fetches server-side and parses the Open Graph metadata.
// `defineEventHandler` / `readBody` are auto-imported by Nitro.

const FETCH_TIMEOUT_MS = 8000
const MAX_HTML_BYTES = 512 * 1024 // only the <head> matters; cap pathological pages.

export default defineEventHandler(async (event) => {
  const started = Date.now()
  const body = await readBody(event).catch(() => ({}))
  const raw = typeof body?.url === 'string' ? body.url.trim() : ''

  let target: URL
  try {
    target = new URL(raw)
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      throw new Error('only http(s) URLs are supported')
    }
  } catch {
    setResponseStatus(event, 400)
    return { error: `Not a valid URL: "${raw}"` }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(target, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // Present as a real browser so sites serve their OG markup.
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
      },
    })
  } catch (e) {
    setResponseStatus(event, 502)
    const reason = controller.signal.aborted ? 'timed out' : (e as Error).message
    return { error: `Couldn't reach ${target.hostname} (${reason})` }
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    setResponseStatus(event, 502)
    return { error: `${target.hostname} responded ${res.status} ${res.statusText}` }
  }

  const finalUrl = res.url || target.href
  const html = (await res.text()).slice(0, MAX_HTML_BYTES)

  const title = meta(html, 'og:title') || tag(html, /<title[^>]*>([^<]*)<\/title>/i)
  const description = meta(html, 'og:description') || meta(html, 'description')
  const siteName = meta(html, 'og:site_name')
  const image = absolutize(meta(html, 'og:image'), finalUrl)
  const favicon =
    absolutize(
      tag(html, /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i),
      finalUrl
    ) || new URL('/favicon.ico', finalUrl).href

  return {
    url: raw,
    finalUrl,
    title,
    description,
    image,
    siteName,
    favicon,
    elapsedMs: Date.now() - started,
    fetchedBy: `Nitro (pid ${process.pid})`,
  }
})

// --- tiny HTML scrapers (regex is plenty for <head> metadata) ---

function tag(html: string, re: RegExp): string | undefined {
  const m = html.match(re)
  return m ? decode(m[1].trim()) : undefined
}

// Match a <meta> by property/name, tolerating attribute order (content before
// or after the key).
function meta(html: string, key: string): string | undefined {
  const k = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (
    tag(
      html,
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']*)["']`,
        'i'
      )
    ) ||
    tag(
      html,
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`,
        'i'
      )
    )
  )
}

function absolutize(href: string | undefined, base: string): string | undefined {
  if (!href) return undefined
  try {
    return new URL(href, base).href
  } catch {
    return undefined
  }
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
}

import { renderToString } from 'react-dom/server'

import { App } from './App'

// The frozen SSR contract: render(url) => Promise<{ html }>. Routing would live
// here, in userland. This is a single page, so we ignore `url` and render the
// same App for every prerendered route (just '/' — see build.prerender).
export async function render(_url: string) {
  return { html: renderToString(<App />) }
}

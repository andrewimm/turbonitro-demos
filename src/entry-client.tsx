import { hydrateRoot } from 'react-dom/client'

import './styles.css'
import { App } from './App'

// Hydrate the prerendered markup that entry-server's render() baked into the
// shell at build time — attaching event handlers without re-rendering the DOM.
hydrateRoot(document.getElementById('root')!, <App />)

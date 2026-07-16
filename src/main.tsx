import { createRoot } from 'react-dom/client'
import './styles.css'

// Resolved via the `@` alias (→ ./src) configured in turbopack.config.ts.
import { App } from '@/App'

createRoot(document.getElementById('root')!).render(<App />)

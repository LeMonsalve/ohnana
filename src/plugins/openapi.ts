import type { Context } from 'hono'
import type { PluginInstance } from '../types'

export type ScalarTheme = 
  | 'default' | 'alternate' | 'moon' | 'purple' | 'solarized'
  | 'bluePlanet' | 'deepSpace' | 'saturn' | 'kepler' | 'mars' 
  | 'laserwave' | 'none'

export interface OpenAPIConfig {
  /** OpenAPI spec object (required) */
  spec: Record<string, unknown>
  /** Path for spec endpoint (default: '/openapi.json') */
  specPath?: string
  /** Path for docs UI (default: '/docs') */
  docsPath?: string
  /** Scalar theme (default: 'default') */
  theme?: ScalarTheme
  /** Page title (default: spec.info.title or 'API Reference') */
  title?: string
  /** Favicon URL */
  favicon?: string
  /** Enable dark mode (default: true) */
  darkMode?: boolean
}

export function openapi(config: OpenAPIConfig): PluginInstance<{}> {
  const specPath = config.specPath ?? '/openapi.json'
  const docsPath = config.docsPath ?? '/docs'
  const theme = config.theme ?? 'default'
  const darkMode = config.darkMode ?? true
  const specInfo = config.spec.info as { title?: string } | undefined
  const title = config.title ?? specInfo?.title ?? 'API Reference'
  const favicon = config.favicon
  
  return {
    id: 'openapi',
    _context: {},
    hooks: {
      onInit: (app) => {
        app.get(specPath, (c: any) => {
          return c.json(config.spec, 200, {
            'Content-Type': 'application/json',
          })
        })
        
        app.get(docsPath, (c: any) => {
          const html = `<!doctype html>
<html>
  <head>
    <title>${title}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${favicon ? `<link rel="icon" href="${favicon}" />` : ''}
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>
      Scalar.createApiReference('#app', {
        url: '${specPath}',
        theme: '${theme}',
        darkMode: ${darkMode},
        _integration: 'hono'
      })
    </script>
  </body>
</html>`
          
          return c.html(html, 200)
        })
      },
    },
  }
}

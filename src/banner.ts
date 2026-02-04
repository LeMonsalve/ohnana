import { colors, createLogger } from './utils'

const logger = createLogger({ format: 'pretty' })

const BANNER = `
${colors.magenta}   ____  _                            
  / __ \\| |__  _ __   __ _ _ __   __ _ 
 | |  | | '_ \\| '_ \\ / _\` | '_ \\ / _\` |
 | |__| | | | | | | | (_| | | | | (_| |
  \\____/|_| |_|_| |_|\\__,_|_| |_|\\__,_|${colors.reset}
`

export interface StartupInfo {
  port: number
  pluginCount?: number
  startTime?: number
}

export function printStartup(info: StartupInfo): void {
  console.log(BANNER)
  logger.info(`${colors.green}🚀 Server running on${colors.reset} ${colors.cyan}http://localhost:${info.port}${colors.reset}`)
  
  if (info.pluginCount !== undefined) {
    logger.info(`${colors.green}📦 ${info.pluginCount} plugins loaded${colors.reset}`)
  }
  
  if (info.startTime !== undefined) {
    const elapsed = Date.now() - info.startTime
    logger.info(`${colors.green}⚡ Ready in${colors.reset} ${colors.dim}${elapsed}ms${colors.reset}`)
  }
  
  console.log()
}

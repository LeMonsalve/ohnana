import { colors } from "./utils/colors";
import pkg from "../package.json";

const BANNER = `
${colors.magenta}   ____  _
  / __ \\| |__  _ __   __ _ _ __   __ _
 | |  | | '_ \\| '_ \\ / _\` | '_ \\ / _\` |
 | |__| | | | | | | | (_| | | | | (_| |
  \\____/|_| |_|_| |_|\\__,_|_| |_|\\__,_|${colors.reset}
`;

export interface StartupInfo {
  port: number;
  pluginCount?: number;
  startTime?: number;
  isDev?: boolean;
}

export function printStartup(info: StartupInfo): void {
  const version = pkg.version;
  const bunVersion = Bun.version;
  const mode = info.isDev ? "development" : "production";
  const modeColor = info.isDev ? colors.yellow : colors.green;
  const modeIcon = info.isDev ? "🔧" : "🚀";

  console.log(BANNER);
  console.log(
    `  ${colors.dim}v${version}${colors.reset} ${colors.dim}|${colors.reset} ${colors.cyan}Bun ${bunVersion}${colors.reset} ${colors.dim}|${colors.reset} ${modeColor}${modeIcon} ${mode}${colors.reset}`,
  );
  console.log();
  
  console.log(
    `  ${colors.green}🌐 Server running on${colors.reset} ${colors.cyan}http://localhost:${info.port}${colors.reset}`,
  );

  if (info.pluginCount !== undefined) {
    console.log(
      `  ${colors.green}📦 ${info.pluginCount} plugins loaded${colors.reset}`,
    );
  }

  if (info.startTime !== undefined) {
    const elapsed = Date.now() - info.startTime;
    console.log(
      `  ${colors.green}⚡ Ready in${colors.reset} ${colors.dim}${elapsed}ms${colors.reset}`,
    );
  }

  console.log();
}

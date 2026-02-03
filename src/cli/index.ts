#!/usr/bin/env bun
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const command = args[0]

if (command === 'create') {
  const projectName = args[1]
  
  if (!projectName) {
    console.error('Error: Project name is required')
    console.log('Usage: ohnana create <name> [--dir=path]')
    process.exit(1)
  }
  
  const dirArg = args.find(arg => arg.startsWith('--dir='))
  const baseDir = dirArg ? dirArg.split('=')[1]! : process.cwd()
  const projectPath = join(baseDir, projectName)
  
  console.log(`Creating Ohnana project: ${projectName}`)
  console.log(`Location: ${projectPath}`)
  
  await createProject(projectPath, projectName)
  
  console.log('\n✅ Project created successfully!')
  console.log('\nNext steps:')
  console.log(`  cd ${projectName}`)
  console.log('  bun run dev')
} else {
  console.log('Usage: ohnana create <name> [--dir=path]')
  process.exit(1)
}

async function createProject(projectPath: string, projectName: string) {
  await mkdir(projectPath, { recursive: true })
  await mkdir(join(projectPath, 'src'), { recursive: true })
  await mkdir(join(projectPath, 'src/routes'), { recursive: true })
  await mkdir(join(projectPath, 'src/middlewares'), { recursive: true })
  await mkdir(join(projectPath, 'src/lib'), { recursive: true })
  await mkdir(join(projectPath, 'src/types'), { recursive: true })
  
  await writeFile(join(projectPath, 'src/index.ts'), getIndexTemplate())
  await writeFile(join(projectPath, 'src/routes/health.ts'), getHealthRouteTemplate())
  await writeFile(join(projectPath, 'src/types/index.ts'), getTypesTemplate())
  await writeFile(join(projectPath, 'package.json'), getPackageJsonTemplate(projectName))
  await writeFile(join(projectPath, 'tsconfig.json'), getTsConfigTemplate())
  await writeFile(join(projectPath, '.gitignore'), getGitignoreTemplate())
  await writeFile(join(projectPath, 'README.md'), getReadmeTemplate(projectName))
  
  console.log('Installing dependencies...')
  execSync('bun install', { cwd: projectPath, stdio: 'inherit' })
}

function getIndexTemplate(): string {
  return `import { ohnana } from 'ohnana'
import { requestId, logger, cors, errorHandler } from 'ohnana/plugins'

const app = ohnana({
  plugins: [
    requestId(),
    logger(),
    errorHandler(),
    cors(),
  ]
})

app.get('/', (c) => {
  return c.json({ 
    message: 'Hello from Ohnana!',
    requestId: c.get('requestId')
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.serve({ port: 3000 })
`
}

function getHealthRouteTemplate(): string {
  return `import type { Context } from 'hono'

export function healthRoute(c: Context) {
  return c.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  })
}
`
}

function getTypesTemplate(): string {
  return `export {}
`
}

function getPackageJsonTemplate(projectName: string): string {
  return JSON.stringify({
    name: projectName,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'bun --hot src/index.ts',
      start: 'bun src/index.ts',
      typecheck: 'tsc --noEmit'
    },
    dependencies: {
      ohnana: 'latest',
      hono: 'latest'
    },
    devDependencies: {
      '@types/bun': 'latest',
      typescript: 'latest'
    }
  }, null, 2)
}

function getTsConfigTemplate(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      lib: ['ES2022'],
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      types: ['bun-types']
    },
    include: ['src/**/*'],
    exclude: ['node_modules']
  }, null, 2)
}

function getGitignoreTemplate(): string {
  return `node_modules/
dist/
.env
.DS_Store
*.log
`
}

function getReadmeTemplate(projectName: string): string {
  return `# ${projectName}

An Ohnana project - a meta-framework for Hono with plugin system.

## Getting Started

\`\`\`bash
bun install
bun run dev
\`\`\`

Visit http://localhost:3000

## Project Structure

\`\`\`
src/
├── index.ts          # Main app with Ohnana plugins
├── routes/           # Route handlers
├── middlewares/      # Custom middlewares
├── lib/              # Shared utilities
└── types/            # TypeScript types
\`\`\`

## Scripts

- \`bun run dev\` - Start development server with hot reload
- \`bun run start\` - Start production server
- \`bun run typecheck\` - Type check without building

## Built with Ohnana

- 🔌 Plugin system with 5 lifecycle hooks
- 🎯 Full TypeScript type inference
- 📦 Built-in plugins: requestId, logger, cors, errorHandler
`
}

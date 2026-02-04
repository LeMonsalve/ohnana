#!/usr/bin/env bun
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import {
  appTemplate,
  healthRouteTemplate,
  typesFileTemplate,
  packageJsonTemplate,
  tsconfigTemplate,
  gitignoreTemplate,
  readmeTemplate
} from './templates'

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
  
  await writeFile(join(projectPath, 'src/index.ts'), appTemplate())
  await writeFile(join(projectPath, 'src/routes/health.ts'), healthRouteTemplate())
  await writeFile(join(projectPath, 'src/types/index.ts'), typesFileTemplate())
  await writeFile(join(projectPath, 'package.json'), packageJsonTemplate(projectName))
  await writeFile(join(projectPath, 'tsconfig.json'), tsconfigTemplate())
  await writeFile(join(projectPath, '.gitignore'), gitignoreTemplate())
  await writeFile(join(projectPath, 'README.md'), readmeTemplate(projectName))
  
  console.log('Installing dependencies...')
  execSync('bun install', { cwd: projectPath, stdio: 'inherit' })
}

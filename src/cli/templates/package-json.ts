export function packageJsonTemplate(projectName: string): string {
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

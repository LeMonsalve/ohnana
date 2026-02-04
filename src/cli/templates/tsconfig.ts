export function tsconfigTemplate(): string {
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

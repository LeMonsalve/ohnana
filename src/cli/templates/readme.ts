export function readmeTemplate(projectName: string): string {
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

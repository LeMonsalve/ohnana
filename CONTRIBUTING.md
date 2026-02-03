# Contributing to Ohnana

Thank you for your interest in contributing to Ohnana! This document provides guidelines for contributing to the project.

## Prerequisites

- [Bun](https://bun.sh) (latest version recommended)
- Git

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ohnana.git
   cd ohnana
   ```
3. **Install dependencies**:
   ```bash
   bun install
   ```
4. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running Tests
```bash
bun test
```

### Type Checking
```bash
bun run typecheck
```

### Development Mode
```bash
bun run dev
```

## Code Standards

- **TypeScript**: All code must be properly typed
- **Tests**: Add tests for new features and bug fixes
- **Documentation**: Update README.md if adding new features
- **Commit messages**: Use clear, descriptive commit messages

## Plugin Development

When creating new plugins:
- Follow the pattern in `src/plugins/`
- Use `definePlugin` from `ohnana/toolkit`
- Export types alongside implementations
- Add JSDoc comments for config interfaces

## Pull Request Process

1. Ensure all tests pass (`bun test`)
2. Ensure type checking passes (`bun run typecheck`)
3. Update documentation if needed
4. Create a pull request with a clear description
5. Link any related issues

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

Feel free to open an issue for questions or discussions.

# Contributing to Nova Link

Thank you for your interest in contributing to Nova Link! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to:

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a positive community environment

## What Can I Contribute?

### ✅ We Welcome

- Bug fixes
- Performance improvements
- New features (discuss first via issue)
- Documentation improvements
- Translations
- UI/UX enhancements
- Test coverage

### ❌ Not Accepted

- Changes to branding/logos (see [TRADEMARKS.md](TRADEMARKS.md))
- Backend modifications (backend is proprietary)
- Features that bypass official services
- Code that introduces security vulnerabilities

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Nova-Link.git
   cd Nova-Link
   ```
3. Install dependencies:
   ```bash
   cd apps/client
   npm install
   ```
4. Start development:
   ```bash
   npm run dev
   ```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `fix/issue-number-description` - Bug fixes
- `feat/feature-description` - New features
- `docs/documentation-update` - Documentation
- `refactor/what-you-refactored` - Code refactoring

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `fix`, `feat`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
fix(auth): resolve 401 error on startup
feat(settings): add auto-update toggle
docs(readme): update installation instructions
```

### Code Style

- Use TypeScript
- Follow existing code patterns
- Run linting before submitting:
  ```bash
  npm run lint
  ```
- Ensure TypeScript compiles:
  ```bash
  npm run typecheck
  ```

## Submitting a Pull Request

1. **Create an issue first** for significant changes
2. **Fork and branch** from `main`
3. **Make your changes** following the guidelines above
4. **Test your changes** thoroughly
5. **Update documentation** if needed
6. **Submit a PR** with:
   - Clear title and description
   - Reference to related issue(s)
   - Screenshots for UI changes

### PR Template

```markdown
## Description
Brief description of changes

## Related Issue
Fixes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring

## Testing
How did you test these changes?

## Screenshots (if applicable)
```

## Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged

## Legal

By submitting a contribution, you agree that:

1. Your contribution is licensed under Apache-2.0
2. You have the right to submit the contribution
3. You understand the [TRADEMARKS.md](TRADEMARKS.md) policy

## Questions?

- Open an issue for questions
- Check existing issues and PRs first
- Be patient - maintainers have limited time

---

Thank you for contributing to Nova Link! 🚀

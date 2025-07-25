# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

All project specific information is in `./README.md`

## Development Guidelines

### Important Constraints

- **NEVER work directly on the main branch**
- **NEVER use yarn, pnpm, or bun** - use npm exclusively
- **NEVER commit code without passing tests and linting**
- **NEVER skip pre-commit hooks or bypass validation**
- **NEVER commit directly to main branch - always use feature branches**
- **NEVER include attribution to Claude in commit messages**
- **NEVER add co-author attribution for AI assistance**
- **NEVER mix main process and renderer process patterns inappropriately**
- **NEVER expose Node.js APIs in renderer without proper security measures**

### Technology Stack

- **Electron** with latest stable version (**mandatory**)
- **TypeScript** with strict mode enabled (**mandatory**)
- **React** for renderer process UI (**mandatory**)
- **ESLint** with Electron/React config (**mandatory**)
- **Webpack** or **Vite** for bundling (**mandatory**)
- **npm** as package manager (**mandatory**)
- **Prettier** for code formatting (**mandatory**)
- **Jest** and **React Testing Library** for testing (**mandatory**)

### Package Management Rules

- Use npm exclusively for package management
- **Forbidden alternatives**: yarn, pnpm, bun
- Install dependencies: `npm install <package>`
- Remove dependencies: `npm uninstall <package>`
- Run scripts: `npm run <script>`
- **Always use exact versions for critical dependencies**

### Development Practices

- **Test-Driven Development (TDD)** for all new features (**mandatory**)
- Write tests first in `__tests__/` or `*.test.ts` files before implementing
- **Test coverage minimum: 85%**
- **All tests must pass before any commits**
- Follow Electron security best practices
- Use context isolation and disable Node.js integration in renderer
- **Never create files longer than 300 lines** - split into components/modules
- Format code before commits: `npm run format`
- Lint code before commits: `npm run lint`

## Project Structure (MANDATORY LAYOUT)

```
electron-app/
├── src/
│   ├── main/
│   │   ├── main.ts
│   │   ├── preload.ts
│   │   ├── ipc/
│   │   │   ├── handlers.ts
│   │   │   └── types.ts
│   │   ├── services/
│   │   │   ├── file-service.ts
│   │   │   └── window-service.ts
│   │   └── utils/
│   │       ├── security.ts
│   │       └── constants.ts
│   ├── renderer/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   └── index.ts
│   │   │   ├── forms/
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── Layout.tsx
│   │   ├── hooks/
│   │   │   ├── useIpcRenderer.ts
│   │   │   └── useElectronStore.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── utils/
│   │   │   ├── helpers.ts
│   │   │   └── constants.ts
│   │   └── styles/
│   │       ├── globals.css
│   │       └── components.css
│   ├── shared/
│   │   ├── types/
│   │   │   ├── ipc.ts
│   │   │   └── app.ts
│   │   └── constants/
│   │       └── channels.ts
├── assets/
│   ├── icons/
│   │   ├── icon.png
│   │   ├── icon.ico
│   │   └── icon.icns
│   └── images/
├── build/
│   ├── icon.png
│   ├── icon.ico
│   └── icon.icns
├── dist/
├── __tests__/
│   ├── main/
│   ├── renderer/
│   └── shared/
├── .env
├── .env.example
├── electron-builder.json
├── webpack.config.js
├── tsconfig.json
├── tsconfig.main.json
├── tsconfig.renderer.json
├── package.json
├── jest.config.js
├── .eslintrc.json
├── .prettierrc
├── README.md
└── CLAUDE.md
```

## Git Workflow (NEVER DEVIATE)

### Branch Strategy

- Use GitHub Flow for main development
- **ALWAYS create feature branches from main**
- **NEVER commit directly to main branch**
- Use descriptive branch names with timestamp format

### Branch Naming Convention

- **Required format**: `feature/<feature-name>-<timestamp>`
- Generate timestamp: `$(date +%Y%m%d%H%M%S)`
- Examples:
  - `feature/settings-window-20250715143022`
  - `feature/file-watcher-20250715143045`

### Feature Development Process (MANDATORY WORKFLOW)

1. **Create feature branch**: `git checkout -b feature/<feature-name>-$(date +%Y%m%d%H%M%S)`
2. **Push branch immediately**: `git push -u origin <branch-name>`
3. **Create PR immediately**: `gh pr create --title "<feature description>" --body "<detailed description>"`
4. **Continue development on branch** - never work on main
5. **Make regular commits** with descriptive messages
6. **MERGE PRs**: When user requests merge, use: `gh pr merge <PR_NUMBER> -m -d -b "$(gh pr view <PR_NUMBER> --json body --jq '.body')"`

### Commit Message Standards

Use Conventional Commits format:

- **Types**: feat, fix, docs, style, refactor, perf, test, chore
- **Format**: `type(scope): description`
- **Examples**:
  - `feat(main): add file system watcher`
  - `fix(renderer): resolve window focus issue`
  - `test(ipc): add unit tests for IPC handlers`
  - `refactor(ui): restructure component hierarchy`

### Pre-Commit Requirements

Before every commit, run:

1. `npm run format` - Format code with Prettier
2. `npm run lint` - Lint code with ESLint
3. `npm run test` - Run all tests
4. `npm run type-check` - TypeScript type checking
5. `npm run build` - Verify build passes
6. **All checks must pass before committing**

## Development Commands

### Environment Setup

```bash
# Create new Electron project structure
mkdir electron-app && cd electron-app
npm init -y

# Install Electron and essential dependencies
npm install electron
npm install -D @types/node typescript

# Install React for renderer
npm install react react-dom
npm install -D @types/react @types/react-dom

# Install build tools
npm install -D webpack webpack-cli webpack-dev-server
npm install -D electron-builder

# Add new dependencies (ONLY method allowed)
npm install <package-name>

# Add dev dependencies
npm install -D <package-name>
```

### Required Scripts in package.json

```json
{
  "main": "dist/main/main.js",
  "scripts": {
    "start": "electron .",
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:main": "webpack --config webpack.main.js --mode development --watch",
    "dev:renderer": "webpack serve --config webpack.renderer.js --mode development",
    "build": "npm run build:main && npm run build:renderer",
    "build:main": "webpack --config webpack.main.js --mode production",
    "build:renderer": "webpack --config webpack.renderer.js --mode production",
    "dist": "npm run build && electron-builder",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:win": "npm run build && electron-builder --win",
    "dist:linux": "npm run build && electron-builder --linux",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "type-check": "tsc --noEmit",
    "type-check:main": "tsc --noEmit -p tsconfig.main.json",
    "type-check:renderer": "tsc --noEmit -p tsconfig.renderer.json"
  }
}
```

### Testing Framework: Jest + React Testing Library

- Use Jest for all testing: `npm run test`
- Test file naming: `*.test.ts` or `*.test.tsx`
- Test directory: `__tests__/` folder mirroring `src/` structure
- Run tests with coverage: `npm run test:coverage`
- **Test coverage minimum: 85%**
- **Tests must pass before any commits**

### TDD Guidelines

1. Write failing tests first
2. Run tests to confirm they fail: `npm run test`
3. Write minimal code to make tests pass
4. Refactor if needed
5. **Never commit without all tests passing**

### Code Quality Checks

```bash
# Format code (mandatory before commits)
npm run format

# Check formatting
npm run format:check

# Lint code (mandatory before commits)
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Type checking (mandatory before commits)
npm run type-check

# Type check main process
npm run type-check:main

# Type check renderer process
npm run type-check:renderer

# Run all tests (mandatory before commits)
npm run test

# Run specific test
npm run test -- --testNamePattern="component name"

# Run tests with coverage
npm run test:coverage

# Build project (mandatory before commits)
npm run build
```

### Running the Application

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start built application
npm start

# Create distributable packages
npm run dist

# Platform-specific builds
npm run dist:mac
npm run dist:win
npm run dist:linux
```

## Electron Best Practices

### Security Guidelines

- **Enable context isolation**: `contextIsolation: true`
- **Disable Node.js integration**: `nodeIntegration: false`
- **Use preload scripts** for secure IPC communication
- **Validate all IPC messages** in main process
- **Never expose Node.js APIs directly** to renderer
- **Use Content Security Policy** in renderer
- **Validate external URLs** before loading

### IPC Communication Patterns

```typescript
// Main Process (main.ts)
import { ipcMain } from 'electron';

ipcMain.handle('file:read', async (event, filePath: string) => {
  // Validate input
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }
  // Implementation
});

// Preload Script (preload.ts)
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
});

// Renderer Process (renderer component)
declare global {
  interface Window {
    electronAPI: {
      readFile: (filePath: string) => Promise<string>;
    };
  }
}

const data = await window.electronAPI.readFile(filePath);
```

### Window Management

- **Create windows in main process only**
- **Use BrowserWindow security options**
- **Handle window lifecycle events**
- **Implement proper window state management**

### File System Access

- **Use secure file dialogs**
- **Validate file paths and extensions**
- **Implement proper error handling**
- **Use streams for large files**

### Process Architecture

- **Main Process**: Application lifecycle, window management, native APIs
- **Renderer Process**: UI rendering, user interactions
- **Preload Scripts**: Secure bridge between main and renderer
- **Shared Types**: Common interfaces and types

## Code Standards Enforcement

### ESLint Configuration

```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react/display-name": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  },
  "env": {
    "electron": true,
    "node": true,
    "browser": true
  }
}
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 80,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### TypeScript Configuration

#### tsconfig.json (Base)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["src/shared/*"],
      "@main/*": ["src/main/*"],
      "@renderer/*": ["src/renderer/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "build"]
}
```

#### tsconfig.main.json (Main Process)
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist/main"
  },
  "include": ["src/main/**/*", "src/shared/**/*"]
}
```

#### tsconfig.renderer.json (Renderer Process)
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "outDir": "dist/renderer"
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

## Required Dependencies

### Core Dependencies

```bash
# Electron core
npm install electron

# React for UI
npm install react react-dom

# Utility libraries
npm install lodash date-fns

# State management (when needed)
npm install zustand # or npm install @reduxjs/toolkit react-redux
```

### Development Dependencies

```bash
# TypeScript support
npm install -D typescript @types/node @types/react @types/react-dom

# Build tools
npm install -D webpack webpack-cli webpack-dev-server
npm install -D html-webpack-plugin copy-webpack-plugin
npm install -D ts-loader css-loader style-loader

# Electron build
npm install -D electron-builder

# Testing
npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @types/jest ts-jest

# Code quality
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D eslint-plugin-react eslint-plugin-react-hooks
npm install -D prettier eslint-config-prettier

# Development utilities
npm install -D concurrently nodemon
```

## Configuration Management

- **Primary**: `.env` file (git-ignored for sensitive data)
- **Secondary**: `.env.example` file (committed, no sensitive data)
- **Use electron-store for persistent app settings**
- **Never commit sensitive values**

### Environment Variables

```bash
# .env (git-ignored)
NODE_ENV=development
LOG_LEVEL=debug
API_URL=https://api.example.com

# .env.example (committed)
NODE_ENV=
LOG_LEVEL=
API_URL=
```

### Electron Builder Configuration

```json
{
  "appId": "com.example.app",
  "productName": "Your App Name",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "assets/**/*",
    "package.json"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "icon": "build/icon.icns"
  },
  "win": {
    "target": "nsis",
    "icon": "build/icon.ico"
  },
  "linux": {
    "target": "AppImage",
    "icon": "build/icon.png"
  }
}
```

## Development Workflow Checklist

### Before Starting New Feature

- [ ] Create feature branch: `git checkout -b feature/<name>-$(date +%Y%m%d%H%M%S)`
- [ ] Push branch: `git push -u origin <branch-name>`
- [ ] Create PR: `gh pr create --title "<title>" --body "<description>"`

### Before Each Commit

- [ ] Format code: `npm run format`
- [ ] Lint code: `npm run lint`
- [ ] Type check: `npm run type-check`
- [ ] Run tests: `npm run test`
- [ ] Build project: `npm run build`
- [ ] All checks passing
- [ ] Commit with conventional format

### TDD Cycle

- [ ] Write failing test
- [ ] Confirm test fails: `npm run test`
- [ ] Write minimal implementation
- [ ] Confirm test passes
- [ ] Refactor if needed
- [ ] Run full test suite

## Never Do

- Work on main branch directly
- Use package managers other than npm
- Commit without passing tests and build
- Skip formatting or linting
- Create files over 300 lines
- Hardcode configuration values
- Include AI attribution in commits
- Bypass pre-commit validation
- Expose Node.js APIs directly to renderer
- Disable context isolation without security review
- Use deprecated Electron APIs
- Ignore TypeScript errors
- Skip security considerations
- Load untrusted external content
- Use eval() or similar dangerous functions
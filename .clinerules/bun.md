# Package Manager & Runtime Rules (Bun Only)

- **ALWAYS use `bun` and `bunx`** for all terminal commands, dependency management, script execution, and running TypeScript/JavaScript files.
- **NEVER use `npm`, `npx`, `yarn`, `pnpm`, or `node`/`tsx`** unless explicitly instructed by the user for a specific edge-case debugging step.

## Command Mappings

- Install dependencies: `bun install` (never `npm install`)
- Add package: `bun add <pkg>` or `bun add -d <pkg>` (never `npm i <pkg>`)
- Remove package: `bun remove <pkg>` (never `npm uninstall <pkg>`)
- Run package.json scripts: `bun run <script>` or `bun <script>` (never `npm run <script>`)
- Execute binaries/CLI tools: `bunx <tool>` (never `npx <tool>`)
- Run TypeScript/JavaScript files directly: `bun <file.ts>` or `bun --watch <file.ts>` (never `node` or `tsx`)
- Run tests: `bun test` (never `npm test` or `npx vitest`/`jest`)

## Lockfile & Environment Rules

- Only maintain `bun.lock` / `bun.lockb`. Do NOT generate `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`.
- When running on Windows, if platform-specific native bindings (e.g., `@rolldown/binding-win32-x64-msvc` or `@tailwindcss/oxide-win32-x64-msvc`) are missing, resolve them using `bun install --force` or `bun add -d <binding-package>`.

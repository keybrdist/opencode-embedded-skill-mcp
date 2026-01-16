# Agent Guidelines for opencode-embedded-skill-mcp

## Project Overview
This is a standalone OpenCode plugin that enables "Skill-Embedded MCP Support". It allows OpenCode skills (markdown files) to define their own Model Context Protocol (MCP) servers, which are automatically loaded and managed by this plugin.

## Technical Stack
- **Runtime**: Node.js
- **Language**: TypeScript
- **SDKs**:
  - `@opencode-ai/plugin`: For OpenCode plugin architecture (tools, lifecycle).
  - `@modelcontextprotocol/sdk`: For managing MCP client connections.

## Development Workflow

1. **Build**:
   Always run the build script after making changes to `src/` files to generate the `dist/` output.
   ```bash
   npm run build
   ```

2. **Verification**:
   Since this is a plugin loaded by OpenCode itself, the best way to verify changes is to:
   - Build the plugin (`npm run build`).
   - Restart the OpenCode instance loading this plugin.
   - Use the `skill` or `skill_mcp` tools to verify functionality.

## Key Conventions

- **Types**: Maintain strict TypeScript typing. Update `src/types.ts` when data structures change.
- **Error Handling**: Provide descriptive error messages. The `SkillMcpManager` handles connection failures gracefully to prevent crashing the host application.
- **Factory Pattern**: Use factory functions (e.g., `createSkillMcpManager`) instead of class constructors for main components to avoid `new` keyword issues in the plugin sandbox.
- **Configuration**:
  - `command`: Array of strings (executable + args).
  - `environment`: Object for env vars (supports `${VAR}` expansion).

## File Structure
- `src/index.ts`: Entry point. Registers tools and lifecycle events.
- `src/skill-loader.ts`: Handles parsing `SKILL.md` frontmatter and `mcp.json`.
- `src/skill-mcp-manager.ts`: Manages MCP client lifecycle, pooling, and cleanup.
- `src/tools/`: Tool definitions (`skill`, `skill_mcp`).

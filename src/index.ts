import type { Plugin } from '@opencode-ai/plugin'
import { createSkillMcpManager } from './skill-mcp-manager.js'
import { discoverSkills } from './skill-loader.js'
import { createSkillTool } from './tools/skill.js'
import { createSkillMcpTool } from './tools/skill-mcp.js'
import type { LoadedSkill } from './types.js'

/**
 * OpenCode Embedded Skill MCP Plugin
 * 
 * Provides skill-embedded MCP support for OpenCode without requiring oh-my-opencode.
 * 
 * Features:
 * - Discovers skills from .opencode/skill/ (project) and ~/.config/opencode/skill/ (user)
 * - Parses MCP configurations from YAML frontmatter or mcp.json files
 * - Provides 'skill' tool to load skill instructions and discover MCP capabilities
 * - Provides 'skill_mcp' tool to invoke MCP operations (tools, resources, prompts)
 * - Manages MCP client connections with pooling, lazy initialization, and cleanup
 */
export const OpenCodeEmbeddedSkillMcp: Plugin = async ({ client }) => {
  const manager = createSkillMcpManager()
  let loadedSkills: LoadedSkill[] = []
  let currentSessionID: string | null = null

  // Discover skills on initialization
  try {
    loadedSkills = await discoverSkills()
  } catch {
    loadedSkills = []
  }

  return {
    // Handle session lifecycle events
    event: async ({ event }) => {
      if (event.type === 'session.created') {
        currentSessionID = event.properties.info.id
      }
      
      if (event.type === 'session.deleted' && currentSessionID) {
        // Cleanup MCP connections for the deleted session
        await manager.disconnectSession(currentSessionID)
        currentSessionID = null
      }
    },

    // Register tools
    tool: {
      skill: createSkillTool({
        skills: loadedSkills,
        mcpManager: manager,
        getSessionID: () => currentSessionID || 'unknown'
      }),
      skill_mcp: createSkillMcpTool({
        manager,
        getLoadedSkills: () => loadedSkills,
        getSessionID: () => currentSessionID || 'unknown'
      })
    }
  }
}

// Default export for plugin loading
export default OpenCodeEmbeddedSkillMcp

// Re-export types for external use
export type { LoadedSkill, McpServerConfig, SkillScope } from './types.js'
export { discoverSkills } from './skill-loader.js'
export { createSkillMcpManager } from './skill-mcp-manager.js'

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool'
import { dirname } from 'path'
import type { LoadedSkill, McpServerConfig } from '../types.js'
import type { SkillMcpManager } from '../skill-mcp-manager.js'
import { parseFrontmatter } from '../utils/frontmatter.js'

const TOOL_DESCRIPTION_NO_SKILLS = 
  'Load a skill to get detailed instructions for a specific task. No skills are currently available.'

const TOOL_DESCRIPTION_PREFIX = 
  `Load a skill to get detailed instructions for a specific task.

Skills provide specialized knowledge and step-by-step guidance.
Use this when a task matches an available skill's description.`

interface SkillInfo {
  name: string
  description: string
  scope: string
}

/**
 * Convert loaded skill to info for display
 */
function loadedSkillToInfo(skill: LoadedSkill): SkillInfo {
  return {
    name: skill.name,
    description: skill.definition.description || '',
    scope: skill.scope
  }
}

/**
 * Format skills as XML for tool description
 */
function formatSkillsXml(skills: SkillInfo[]): string {
  if (skills.length === 0) return ''

  const skillsXml = skills.map((skill) => {
    return [
      '  <skill>',
      `    <name>${skill.name}</name>`,
      `    <description>${skill.description}</description>`,
      '  </skill>'
    ].join('\n')
  }).join('\n')

  return `

<available_skills>
${skillsXml}
</available_skills>`
}

/**
 * Extract skill body content
 */
async function extractSkillBody(skill: LoadedSkill): Promise<string> {
  if (skill.lazyContent) {
    const fullTemplate = await skill.lazyContent.load()
    const templateMatch = fullTemplate.match(/<skill-instruction>([\s\S]*?)<\/skill-instruction>/)
    return templateMatch ? templateMatch[1].trim() : fullTemplate
  }

  if (skill.path) {
    const { readFileSync } = await import('fs')
    const content = readFileSync(skill.path, 'utf-8')
    const { body } = parseFrontmatter(content)
    return body.trim()
  }

  const templateMatch = skill.definition.template?.match(
    /<skill-instruction>([\s\S]*?)<\/skill-instruction>/
  )
  return templateMatch ? templateMatch[1].trim() : skill.definition.template || ''
}

interface McpTool {
  name: string
  description?: string
  inputSchema?: unknown
}

interface McpResource {
  uri: string
}

interface McpPrompt {
  name: string
}

/**
 * Format MCP capabilities for display
 */
async function formatMcpCapabilities(
  skill: LoadedSkill,
  manager: SkillMcpManager,
  sessionID: string
): Promise<string | null> {
  if (!skill.mcpConfig || Object.keys(skill.mcpConfig).length === 0) {
    return null
  }

  const sections: string[] = ['', '## Available MCP Servers', '']

  for (const [serverName, config] of Object.entries(skill.mcpConfig)) {
    const info = {
      serverName,
      skillName: skill.name,
      sessionID
    }

    const context = {
      config: config as McpServerConfig,
      skillName: skill.name
    }

    sections.push(`### ${serverName}`)
    sections.push('')

    try {
      const [tools, resources, prompts] = await Promise.all([
        manager.listTools(info, context).catch(() => []) as Promise<McpTool[]>,
        manager.listResources(info, context).catch(() => []) as Promise<McpResource[]>,
        manager.listPrompts(info, context).catch(() => []) as Promise<McpPrompt[]>
      ])

      if (tools.length > 0) {
        sections.push('**Tools:**')
        sections.push('')
        for (const t of tools) {
          sections.push(`#### \`${t.name}\``)
          if (t.description) {
            sections.push(t.description)
          }
          sections.push('')
          sections.push('**inputSchema:**')
          sections.push('```json')
          sections.push(JSON.stringify(t.inputSchema, null, 2))
          sections.push('```')
          sections.push('')
        }
      }

      if (resources.length > 0) {
        sections.push(`**Resources**: ${resources.map((r) => r.uri).join(', ')}`)
      }

      if (prompts.length > 0) {
        sections.push(`**Prompts**: ${prompts.map((p) => p.name).join(', ')}`)
      }

      if (tools.length === 0 && resources.length === 0 && prompts.length === 0) {
        sections.push('*No capabilities discovered*')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      sections.push(`*Failed to connect: ${errorMessage.split('\n')[0]}*`)
    }

    sections.push('')
    sections.push(`Use \`skill_mcp\` tool with \`mcp_name="${serverName}"\` to invoke.`)
    sections.push('')
  }

  return sections.join('\n')
}

export interface CreateSkillToolOptions {
  skills: LoadedSkill[]
  mcpManager?: SkillMcpManager
  getSessionID?: () => string
}

/**
 * Create the skill tool
 */
export function createSkillTool(options: CreateSkillToolOptions): ToolDefinition {
  const { skills, mcpManager, getSessionID } = options

  // Build description with available skills
  const skillInfos = skills.map(loadedSkillToInfo)
  const description = skillInfos.length === 0
    ? TOOL_DESCRIPTION_NO_SKILLS
    : TOOL_DESCRIPTION_PREFIX + formatSkillsXml(skillInfos)

  return tool({
    description,
    args: {
      name: tool.schema.string().describe(
        "The skill identifier from available_skills (e.g., 'code-review' or 'my-skill')"
      )
    },
    async execute(args) {
      const skill = skills.find((s) => s.name === args.name)

      if (!skill) {
        const available = skills.map((s) => s.name).join(', ')
        throw new Error(
          `Skill "${args.name}" not found. Available skills: ${available || 'none'}`
        )
      }

      const body = await extractSkillBody(skill)
      const dir = skill.path ? dirname(skill.path) : skill.resolvedPath || process.cwd()

      const output = [
        `## Skill: ${skill.name}`,
        '',
        `**Base directory**: ${dir}`,
        '',
        body
      ]

      // Add MCP capabilities if manager available
      if (mcpManager && getSessionID && skill.mcpConfig) {
        const mcpInfo = await formatMcpCapabilities(skill, mcpManager, getSessionID())
        if (mcpInfo) {
          output.push(mcpInfo)
        }
      }

      return output.join('\n')
    }
  })
}

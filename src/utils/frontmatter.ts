import * as yaml from 'js-yaml'
import type { ParsedFrontmatter, SkillFrontmatter, McpServerConfig } from '../types.js'

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  
  if (!frontmatterMatch) {
    return {
      data: {},
      body: content
    }
  }

  try {
    const data = yaml.load(frontmatterMatch[1]) as SkillFrontmatter
    const body = content.slice(frontmatterMatch[0].length).trim()
    return { data: data || {}, body }
  } catch {
    return {
      data: {},
      body: content
    }
  }
}

/**
 * Parse MCP config specifically from frontmatter content
 */
export function parseSkillMcpConfigFromFrontmatter(
  content: string
): Record<string, McpServerConfig> | undefined {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  
  if (!frontmatterMatch) {
    return undefined
  }

  try {
    const parsed = yaml.load(frontmatterMatch[1]) as { mcp?: Record<string, McpServerConfig> }
    if (parsed && typeof parsed === 'object' && 'mcp' in parsed && parsed.mcp) {
      return parsed.mcp
    }
  } catch {
    return undefined
  }

  return undefined
}

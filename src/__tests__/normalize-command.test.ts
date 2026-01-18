import { describe, it, expect } from 'vitest'
import { normalizeCommand } from '../utils/env-vars.js'
import type { McpServerConfig } from '../types.js'

describe('normalizeCommand', () => {
  describe('OpenCode format (command as array)', () => {
    it('parses command array with executable and args', () => {
      const config: McpServerConfig = {
        command: ['npx', '-y', '@playwright/mcp@latest']
      }

      const result = normalizeCommand(config)

      expect(result.command).toBe('npx')
      expect(result.args).toEqual(['-y', '@playwright/mcp@latest'])
    })

    it('handles command array with only executable', () => {
      const config: McpServerConfig = {
        command: ['node']
      }

      const result = normalizeCommand(config)

      expect(result.command).toBe('node')
      expect(result.args).toEqual([])
    })

    it('converts non-string array elements to strings', () => {
      const config: McpServerConfig = {
        command: ['node', '--port', 3000 as unknown as string]
      }

      const result = normalizeCommand(config)

      expect(result.command).toBe('node')
      expect(result.args).toEqual(['--port', '3000'])
    })
  })

  describe('oh-my-opencode format (command string + args array)', () => {
    it('parses command string with args array', () => {
      const config: McpServerConfig = {
        command: 'npx',
        args: ['-y', '@anthropic-ai/mcp-playwright']
      }

      const result = normalizeCommand(config)

      expect(result.command).toBe('npx')
      expect(result.args).toEqual(['-y', '@anthropic-ai/mcp-playwright'])
    })

    it('handles command string without args', () => {
      const config: McpServerConfig = {
        command: 'node'
      }

      const result = normalizeCommand(config)

      expect(result.command).toBe('node')
      expect(result.args).toEqual([])
    })

    it('handles command string with empty args array', () => {
      const config: McpServerConfig = {
        command: 'python',
        args: []
      }

      const result = normalizeCommand(config)

      expect(result.command).toBe('python')
      expect(result.args).toEqual([])
    })

    it('converts non-string args to strings', () => {
      const config: McpServerConfig = {
        command: 'node',
        args: ['--port', 8080 as unknown as string]
      }

      const result = normalizeCommand(config)

      expect(result.command).toBe('node')
      expect(result.args).toEqual(['--port', '8080'])
    })
  })

  describe('edge cases', () => {
    it('throws error when command is undefined', () => {
      const config: McpServerConfig = {}

      expect(() => normalizeCommand(config)).toThrow(
        'Invalid MCP command configuration: command must be a string or array'
      )
    })

    it('ignores args field when command is array (OpenCode format takes precedence)', () => {
      const config: McpServerConfig = {
        command: ['npx', '-y', '@some/package'],
        args: ['should', 'be', 'ignored']
      }

      const result = normalizeCommand(config)

      expect(result.command).toBe('npx')
      expect(result.args).toEqual(['-y', '@some/package'])
    })
  })
})

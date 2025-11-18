import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AIClient, createAIClient } from '@/ai/client'
import type { AIConfig } from '@/config/types'

// Mock fetch
global.fetch = vi.fn()

describe('AIClient', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockOllamaConfig: AIConfig = {
    enabled: true,
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'codellama',
    timeout: 5000,
  }

  describe('generateKey', () => {
    it('should generate key using Ollama', async () => {
      const client = new AIClient(mockOllamaConfig)

      // Mock successful Ollama response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            key: 'common.greeting.hello',
            confidence: 0.9,
            reasoning: 'Common greeting message',
          }),
        }),
      })

      const result = await client.generateKey('Hello World', {
        file: '/src/Component.vue',
        componentName: 'Component',
      })

      expect(result.key).toBe('common.greeting.hello')
      expect(result.confidence).toBe(0.9)
      expect(result.reasoning).toBe('Common greeting message')

      // Verify fetch was called with correct params
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('codellama'),
        }),
      )
    })

    it('should handle Anthropic provider', async () => {
      const anthropicConfig: AIConfig = {
        enabled: true,
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-api-key',
        timeout: 5000,
      }

      const client = new AIClient(anthropicConfig)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify({
              key: 'form.placeholder.email',
              confidence: 0.95,
              reasoning: 'Email input placeholder',
            }),
          }],
        }),
      })

      const result = await client.generateKey('Enter email', {
        file: '/src/Form.vue',
        attributeName: 'placeholder',
      })

      expect(result.key).toBe('form.placeholder.email')
      expect(result.confidence).toBe(0.95)

      // Verify Anthropic API call
      const fetchCall = (global.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toBe('https://api.anthropic.com/v1/messages')
      expect(fetchCall[1].method).toBe('POST')
      expect(fetchCall[1].headers).toHaveProperty('x-api-key', 'test-api-key')
      expect(fetchCall[1].headers).toHaveProperty('anthropic-version', '2023-06-01')
    })

    it('should handle OpenAI provider', async () => {
      const openaiConfig: AIConfig = {
        enabled: true,
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-openai-key',
        timeout: 5000,
      }

      const client = new AIClient(openaiConfig)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                key: 'button.submit',
                confidence: 0.88,
              }),
            },
          }],
        }),
      })

      const result = await client.generateKey('Submit', {
        file: '/src/Button.vue',
      })

      expect(result.key).toBe('button.submit')

      // Verify OpenAI API call
      const fetchCall = (global.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toBe('https://api.openai.com/v1/chat/completions')
      expect(fetchCall[1].method).toBe('POST')
      expect(fetchCall[1].headers).toHaveProperty('Authorization', 'Bearer test-openai-key')
    })

    it('should throw error when AI is disabled', async () => {
      const disabledConfig: AIConfig = {
        enabled: false,
      }

      const client = new AIClient(disabledConfig)

      await expect(
        client.generateKey('Test', { file: '/test.vue' }),
      ).rejects.toThrow('AI is not enabled')
    })

    it('should handle timeout', async () => {
      const client = new AIClient({
        ...mockOllamaConfig,
        timeout: 10, // Very short timeout
      })

      // Simulate slow response that gets aborted
      ;(global.fetch as any).mockImplementationOnce(() =>
        new Promise((resolve, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted')
            error.name = 'AbortError'
            reject(error)
          }, 20)
        }),
      )

      await expect(
        client.generateKey('Test', { file: '/test.vue' }),
      ).rejects.toThrow(/timed out/)
    })

    it('should handle API errors', async () => {
      const client = new AIClient(mockOllamaConfig)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      await expect(
        client.generateKey('Test', { file: '/test.vue' }),
      ).rejects.toThrow('LLM API error (500)')
    })

    it('should handle malformed JSON responses', async () => {
      const client = new AIClient(mockOllamaConfig)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'The key should be "key": "test.key" but malformed',
        }),
      })

      const result = await client.generateKey('Test', { file: '/test.vue' })

      // Should extract key from malformed response
      expect(result.key).toBe('test.key')
      expect(result.confidence).toBeLessThan(0.5)
    })

    it('should require API key for cloud providers', async () => {
      const anthropicConfig: AIConfig = {
        enabled: true,
        provider: 'anthropic',
        // No API key
      }

      const client = new AIClient(anthropicConfig)

      await expect(
        client.generateKey('Test', { file: '/test.vue' }),
      ).rejects.toThrow('API key required')
    })

    it('should include context in prompt', async () => {
      const client = new AIClient(mockOllamaConfig)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            key: 'test.key',
            confidence: 0.5,
          }),
        }),
      })

      await client.generateKey('Test message', {
        file: '/src/components/UserProfile.vue',
        componentName: 'UserProfile',
        attributeName: 'placeholder',
        nearbyCode: 'const user = ref()',
      })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      const prompt = body.prompt

      expect(prompt).toContain('Test message')
      expect(prompt).toContain('UserProfile.vue')
      expect(prompt).toContain('UserProfile')
      expect(prompt).toContain('placeholder')
      expect(prompt).toContain('const user = ref()')
    })
  })

  describe('translateText', () => {
    it('should translate text to target language', async () => {
      const client = new AIClient(mockOllamaConfig)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            translation: 'Hallo',
            confidence: 0.95,
          }),
        }),
      })

      const result = await client.translateText('Hello', 'de', {
        key: 'greeting',
        sourceLanguage: 'en',
        category: 'common',
      })

      expect(result.translation).toBe('Hallo')
      expect(result.confidence).toBe(0.95)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      expect(requestBody.prompt).toContain('Hello')
      expect(requestBody.prompt).toContain('German')
      expect(requestBody.prompt).toContain('JSON') // Simplified prompt
    })

    it('should handle malformed translation response', async () => {
      const client = new AIClient(mockOllamaConfig)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'Hallo', // Not JSON format
        }),
      })

      const result = await client.translateText('Hello', 'de')

      expect(result.translation).toBe('Hallo')
      expect(result.confidence).toBeLessThan(0.5)
    })

    it('should preserve placeholders in translation prompt', async () => {
      const client = new AIClient(mockOllamaConfig)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            translation: 'Hallo {name}',
            confidence: 0.9,
          }),
        }),
      })

      await client.translateText('Hello {name}', 'de')

      const fetchCall = (global.fetch as any).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      expect(requestBody.prompt).toContain('Preserve any variables')
    })
  })

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      const client = new AIClient(mockOllamaConfig)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'OK',
        }),
      })

      const result = await client.testConnection()

      expect(result).toBe(true)
    })

    it('should return false for failed connection', async () => {
      const client = new AIClient(mockOllamaConfig)

      ;(global.fetch as any).mockRejectedValueOnce(new Error('Connection failed'))

      const result = await client.testConnection()

      expect(result).toBe(false)
    })
  })

  describe('createAIClient', () => {
    it('should return null when AI is disabled', () => {
      const config: AIConfig = {
        enabled: false,
      }

      const client = createAIClient(config)

      expect(client).toBeNull()
    })

    it('should create client when AI is enabled', () => {
      const client = createAIClient(mockOllamaConfig)

      expect(client).toBeInstanceOf(AIClient)
    })
  })
})

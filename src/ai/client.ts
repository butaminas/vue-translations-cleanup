import type { AIConfig } from '@/config/types'

export interface AIKeyGeneration {
  key: string
  confidence: number
  reasoning?: string
}

/**
 * AI client for communicating with LLM providers
 */
export class AIClient {
  private config: AIConfig

  constructor(config: AIConfig) {
    this.config = config
  }

  /**
   * Generate a better translation key using AI
   */
  async generateKey(
    text: string,
    context: {
      file: string
      componentName?: string
      attributeName?: string
      nearbyCode?: string
    },
  ): Promise<AIKeyGeneration> {
    if (!this.config.enabled) {
      throw new Error('AI is not enabled')
    }

    const prompt = this.buildKeyGenerationPrompt(text, context)

    try {
      const response = await this.callLLM(prompt)
      return this.parseKeyGenerationResponse(response)
    }
    catch (error) {
      console.warn('AI key generation failed:', error)
      // Fallback to heuristic approach
      throw error
    }
  }

  /**
   * Build a prompt for key generation
   */
  private buildKeyGenerationPrompt(
    text: string,
    context: {
      file: string
      componentName?: string
      attributeName?: string
      nearbyCode?: string
    },
  ): string {
    return `You are a translation key generator for an i18n system. Generate a semantic, hierarchical translation key for the following text.

Text to translate: "${text}"

Context:
- File: ${context.file}
${context.componentName ? `- Component: ${context.componentName}` : ''}
${context.attributeName ? `- HTML Attribute: ${context.attributeName}` : ''}
${context.nearbyCode ? `- Nearby code:\n${context.nearbyCode}` : ''}

Requirements:
- Use dot notation (e.g., "common.buttons.submit")
- Be concise but descriptive
- Use lowercase
- Group related translations together
- Maximum 50 characters

Respond with JSON in this format:
{
  "key": "your.generated.key",
  "confidence": 0.8,
  "reasoning": "Brief explanation"
}`
  }

  /**
   * Call the LLM provider
   */
  private async callLLM(prompt: string): Promise<string> {
    const provider = this.config.provider || 'ollama'
    const model = this.config.model || 'codellama'
    const timeout = this.config.timeout || 30000

    // Get provider-specific base URL
    const getBaseUrl = () => {
      if (this.config.baseUrl) {
        return this.config.baseUrl
      }

      switch (provider) {
        case 'anthropic':
          return 'https://api.anthropic.com'
        case 'openai':
          return 'https://api.openai.com'
        case 'ollama':
        case 'lmstudio':
        case 'localai':
        default:
          return 'http://localhost:11434'
      }
    }

    const baseUrl = getBaseUrl()

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      let response: Response

      if (provider === 'ollama') {
        // Ollama API format
        response = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers,
          },
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
          }),
          signal: controller.signal,
        })
      }
      else if (provider === 'anthropic') {
        // Anthropic API format
        if (!this.config.apiKey) {
          throw new Error('API key required for Anthropic')
        }

        response = await fetch(`${baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01',
            ...this.config.headers,
          },
          body: JSON.stringify({
            model: model || 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: prompt,
            }],
          }),
          signal: controller.signal,
        })
      }
      else if (provider === 'openai') {
        // OpenAI API format
        if (!this.config.apiKey) {
          throw new Error('API key required for OpenAI')
        }

        response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            ...this.config.headers,
          },
          body: JSON.stringify({
            model: model || 'gpt-4',
            messages: [{
              role: 'user',
              content: prompt,
            }],
          }),
          signal: controller.signal,
        })
      }
      else {
        // Generic OpenAI-compatible API
        response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers,
          },
          body: JSON.stringify({
            model,
            messages: [{
              role: 'user',
              content: prompt,
            }],
          }),
          signal: controller.signal,
        })
      }

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`LLM API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      return this.extractResponseText(data, provider)
    }
    catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`LLM request timed out after ${timeout}ms`)
      }

      throw error
    }
  }

  /**
   * Extract response text from different provider formats
   */
  private extractResponseText(data: any, provider: string): string {
    if (provider === 'ollama') {
      return data.response || ''
    }
    else if (provider === 'anthropic') {
      return data.content?.[0]?.text || ''
    }
    else if (provider === 'openai' || provider === 'lmstudio' || provider === 'localai' || provider === 'custom') {
      return data.choices?.[0]?.message?.content || ''
    }

    throw new Error(`Unknown provider format: ${provider}`)
  }

  /**
   * Parse the AI response into a key generation result
   */
  private parseKeyGenerationResponse(response: string): AIKeyGeneration {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        key: parsed.key || '',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning,
      }
    }
    catch (error) {
      console.warn('Failed to parse AI response, extracting key manually')

      // Fallback: try to extract key from response
      const keyMatch = response.match(/["']?key["']?\s*:\s*["']([^"']+)["']/)
      if (keyMatch) {
        return {
          key: keyMatch[1],
          confidence: 0.3,
          reasoning: 'Extracted from malformed response',
        }
      }

      throw new Error('Could not parse AI response')
    }
  }

  /**
   * Translate text to target language
   */
  async translateText(
    text: string,
    targetLanguage: string,
    context?: {
      key?: string
      sourceLanguage?: string
      category?: string
    },
  ): Promise<{ translation: string, confidence: number }> {
    const prompt = this.buildTranslationPrompt(text, targetLanguage, context)

    try {
      const response = await this.callLLM(prompt)
      return this.parseTranslationResponse(response)
    }
    catch (error) {
      const err = error as Error
      console.error(`AI translation failed: ${err.message}`)
      throw error
    }
  }

  /**
   * Build prompt for translation
   */
  private buildTranslationPrompt(
    text: string,
    targetLanguage: string,
    context?: {
      key?: string
      sourceLanguage?: string
      category?: string
    },
  ): string {
    const sourceLang = context?.sourceLanguage || 'English'
    const langNames: Record<string, string> = {
      en: 'English',
      de: 'German',
      fr: 'French',
      es: 'Spanish',
      it: 'Italian',
      nl: 'Dutch',
      pt: 'Portuguese',
      ru: 'Russian',
      ja: 'Japanese',
      zh: 'Chinese',
      ko: 'Korean',
      ar: 'Arabic',
      hi: 'Hindi',
    }
    const targetLangName = langNames[targetLanguage] || targetLanguage

    return `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLangName}.

Text to translate: "${text}"

Context:
${context?.key ? `- Translation key: ${context.key}` : ''}
${context?.category ? `- Category: ${context.category}` : ''}

Requirements:
- Preserve any HTML tags, variables, or placeholders exactly as they appear (e.g., {name}, {{count}}, <strong>, etc.)
- Maintain the same tone and formality level
- Use natural, idiomatic expressions in ${targetLangName}
- Keep technical terms consistent
- Preserve capitalization style (if all caps, keep all caps)

Respond with JSON in this format:
{
  "translation": "your translation here",
  "confidence": 0.95
}`
  }

  /**
   * Parse translation response
   */
  private parseTranslationResponse(response: string): { translation: string, confidence: number } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        translation: parsed.translation || '',
        confidence: parsed.confidence || 0.5,
      }
    }
    catch (error) {
      console.warn('Failed to parse AI translation response, extracting text manually')

      // Fallback: try to extract translation from response
      const translationMatch = response.match(/["']?translation["']?\s*:\s*["']([^"']+)["']/)
      if (translationMatch) {
        return {
          translation: translationMatch[1],
          confidence: 0.3,
        }
      }

      // Last resort: use the entire response as translation
      const cleanedResponse = response.trim().replace(/^["']|["']$/g, '')
      if (cleanedResponse.length > 0) {
        return {
          translation: cleanedResponse,
          confidence: 0.2,
        }
      }

      throw new Error('Could not parse AI translation response')
    }
  }

  /**
   * Test connection to the LLM
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.callLLM('Test message. Respond with "OK".')
      return response.includes('OK') || response.length > 0
    }
    catch {
      return false
    }
  }
}

/**
 * Create an AI client from config
 */
export function createAIClient(config: AIConfig): AIClient | null {
  if (!config.enabled) {
    return null
  }

  return new AIClient(config)
}

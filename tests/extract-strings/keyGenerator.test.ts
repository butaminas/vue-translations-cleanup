import { describe, expect, it } from 'vitest'
import { generateKey, generateKeys, groupKeysByPrefix, suggestBetterKey } from '@/extract-strings/keyGenerator'
import type { RawStringLocation } from '@/extract-strings/types'

describe('keyGenerator', () => {
  const createLocation = (overrides?: Partial<RawStringLocation>): RawStringLocation => ({
    text: 'Test message',
    file: '/src/components/TestComponent.vue',
    line: 1,
    column: 1,
    context: 'template',
    confidence: 'high',
    ...overrides,
  })

  describe('generateKey', () => {
    it('should generate snake_case key by default', () => {
      const location = createLocation({ text: 'Hello World' })
      const config = { keyFormat: 'snake_case' as const }

      const key = generateKey('Hello World', location, config)

      // Should use dot notation for hierarchy: component.key
      expect(key).toBe('test_component.hello_world')
    })

    it('should generate camelCase key', () => {
      const location = createLocation({ text: 'Hello World' })
      const config = { keyFormat: 'camelCase' as const }

      const key = generateKey('Hello World', location, config)

      // Should use dot notation for hierarchy: component.key (with camelCase parts)
      expect(key).toBe('testComponent.helloWorld')
    })

    it('should generate kebab-case key', () => {
      const location = createLocation({ text: 'Hello World' })
      const config = { keyFormat: 'kebab-case' as const }

      const key = generateKey('Hello World', location, config)

      // Should use dot notation for hierarchy: component.key (with kebab-case parts)
      expect(key).toBe('test-component.hello-world')
    })

    it('should generate dot.case key', () => {
      const location = createLocation({ text: 'Hello World' })
      const config = { keyFormat: 'dot.case' as const }

      const key = generateKey('Hello World', location, config)

      // Should use dot notation for hierarchy: component.key (with dot.case parts)
      expect(key).toBe('test.component.hello.world')
    })

    it('should include component prefix', () => {
      const location = createLocation({
        text: 'Submit',
        file: '/src/components/LoginForm.vue',
      })
      const config = {}

      const key = generateKey('Submit', location, config)

      // Should use dot notation: component.key
      expect(key).toBe('login_form.submit')
    })

    it('should NOT include attribute name in key path', () => {
      const location = createLocation({
        text: 'Enter your name',
        context: 'attribute',
        attributeName: 'placeholder',
        file: '/src/components/UserForm.vue',
      })
      const config = {}

      const key = generateKey('Enter your name', location, config)

      // Attribute name should NOT be part of the key path
      expect(key).toBe('user_form.enter_your_name')
      expect(key).not.toContain('placeholder')
    })

    it('should truncate long keys', () => {
      const location = createLocation({
        text: 'This is a very long message that should be truncated to fit the maximum key length',
      })
      const config = { maxKeyLength: 30 }

      const key = generateKey(location.text, location, config)

      expect(key.length).toBeLessThanOrEqual(30)
    })

    it('should handle duplicate keys by adding suffix', () => {
      const location = createLocation({ text: 'Submit' })
      const config = {}
      const existingKeys = new Set(['test_component.submit'])

      const key = generateKey('Submit', location, config, existingKeys)

      // Should add numeric suffix: test_component.submit_2
      expect(key).toBe('test_component.submit_2')
    })

    it('should handle special characters in text', () => {
      const location = createLocation({
        text: "Hello! What's your name?",
      })
      const config = {}

      const key = generateKey(location.text, location, config)

      // Should remove special characters
      expect(key).not.toContain('!')
      expect(key).not.toContain('?')
      expect(key).not.toContain("'")
    })
  })

  describe('generateKeys', () => {
    it('should generate keys for multiple strings', () => {
      const rawStrings: RawStringLocation[] = [
        createLocation({ text: 'Hello World' }),
        createLocation({ text: 'Welcome' }),
        createLocation({ text: 'Goodbye' }),
      ]
      const config = {}

      const keyMap = generateKeys(rawStrings, config)

      expect(keyMap.size).toBe(3)
      expect(keyMap.get('Hello World')).toBeDefined()
      expect(keyMap.get('Welcome')).toBeDefined()
      expect(keyMap.get('Goodbye')).toBeDefined()
    })

    it('should handle duplicates automatically', () => {
      const rawStrings: RawStringLocation[] = [
        createLocation({ text: 'Submit', file: '/src/ComponentA.vue' }),
        createLocation({ text: 'Submit', file: '/src/ComponentB.vue' }),
      ]
      const config = {}

      const keyMap = generateKeys(rawStrings, config)

      // Same text should map to the same key (deduplication)
      expect(keyMap.size).toBe(1)
      expect(keyMap.has('Submit')).toBe(true)
    })

    it('should preserve all unique texts', () => {
      const rawStrings: RawStringLocation[] = [
        createLocation({ text: 'First message' }),
        createLocation({ text: 'Second message' }),
        createLocation({ text: 'Third message' }),
      ]
      const config = {}

      const keyMap = generateKeys(rawStrings, config)

      expect(keyMap.has('First message')).toBe(true)
      expect(keyMap.has('Second message')).toBe(true)
      expect(keyMap.has('Third message')).toBe(true)
    })
  })

  describe('suggestBetterKey', () => {
    it('should detect button actions', () => {
      const location = createLocation({ text: 'Click here to submit' })
      const config = {}

      const suggestion = suggestBetterKey('Click here to submit', location, config)

      expect(suggestion.key).toContain('click')
      expect(suggestion.reason).toContain('button')
    })

    it('should detect error messages', () => {
      const location = createLocation({ text: 'An error occurred' })
      const config = {}

      const suggestion = suggestBetterKey('An error occurred', location, config)

      expect(suggestion.key).toContain('error')
      expect(suggestion.reason).toContain('Error message')
    })

    it('should detect success messages', () => {
      const location = createLocation({ text: 'Successfully saved' })
      const config = {}

      const suggestion = suggestBetterKey('Successfully saved', location, config)

      expect(suggestion.key).toContain('success')
      expect(suggestion.reason).toContain('Success message')
    })

    it('should detect form placeholders', () => {
      const location = createLocation({
        text: 'Enter email',
        context: 'attribute',
        attributeName: 'placeholder',
      })
      const config = {}

      const suggestion = suggestBetterKey('Enter email', location, config)

      expect(suggestion.key).toContain('placeholder')
      expect(suggestion.reason).toContain('placeholder')
    })

    it('should detect tooltip titles', () => {
      const location = createLocation({
        text: 'Click for more info',
        context: 'attribute',
        attributeName: 'title',
      })
      const config = {}

      const suggestion = suggestBetterKey('Click for more info', location, config)

      expect(suggestion.key).toContain('title')
      expect(suggestion.reason).toContain('title')
    })

    it('should provide default suggestion for unrecognized patterns', () => {
      const location = createLocation({ text: 'Random text' })
      const config = {}

      const suggestion = suggestBetterKey('Random text', location, config)

      expect(suggestion.key).toBeDefined()
      expect(suggestion.reason).toContain('Default')
    })
  })

  describe('groupKeysByPrefix', () => {
    it('should group keys by common prefix', () => {
      const keyMap = new Map([
        ['Hello', 'common.greeting.hello'],
        ['Goodbye', 'common.greeting.goodbye'],
        ['Error', 'error.general'],
        ['Success', 'success.general'],
      ])

      const groups = groupKeysByPrefix(keyMap)

      expect(groups.has('common.greeting')).toBe(true)
      expect(groups.get('common.greeting')).toContain('common.greeting.hello')
      expect(groups.get('common.greeting')).toContain('common.greeting.goodbye')
    })

    it('should handle keys without prefix', () => {
      const keyMap = new Map([
        ['Single', 'single'],
        ['Another', 'another'],
      ])

      const groups = groupKeysByPrefix(keyMap)

      expect(groups.has('root')).toBe(true)
    })

    it('should handle snake_case keys', () => {
      const keyMap = new Map([
        ['Test 1', 'component_test_one'],
        ['Test 2', 'component_test_two'],
        ['Other', 'other_key'],
      ])

      const groups = groupKeysByPrefix(keyMap)

      expect(groups.has('component_test')).toBe(true)
      expect(groups.get('component_test')).toHaveLength(2)
    })

    it('should handle kebab-case keys', () => {
      const keyMap = new Map([
        ['Test 1', 'component-test-one'],
        ['Test 2', 'component-test-two'],
      ])

      const groups = groupKeysByPrefix(keyMap)

      expect(groups.has('component-test')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty text', () => {
      const location = createLocation({ text: '' })
      const config = {}

      const key = generateKey('', location, config)

      expect(key).toBeDefined()
      expect(typeof key).toBe('string')
    })

    it('should handle text with only special characters', () => {
      const location = createLocation({ text: '!@#$%^&*()' })
      const config = {}

      const key = generateKey('!@#$%^&*()', location, config)

      expect(key).toBeDefined()
      expect(typeof key).toBe('string')
    })

    it('should handle very long component names', () => {
      const location = createLocation({
        text: 'Test',
        file: '/src/components/VeryLongComponentNameThatExceedsReasonableLimits.vue',
      })
      const config = { maxKeyLength: 50 }

      const key = generateKey('Test', location, config)

      expect(key.length).toBeLessThanOrEqual(50)
    })

    it('should handle numbers in text', () => {
      const location = createLocation({ text: 'Step 1 of 3' })
      const config = {}

      const key = generateKey('Step 1 of 3', location, config)

      expect(key).toContain('step')
    })
  })
})

import { describe, test, expect, beforeEach } from 'bun:test'
import { CanonicalSuggester } from '../src/validators/canonical-suggester.js'
import { TailwindValidator } from '../src/validators/tailwind-validator.js'
import { Logger } from '../src/utils/logger.js'

describe('Vue snippet canonical suggestions', () => {
  let suggester: CanonicalSuggester
  let validator: TailwindValidator
  let logger: Logger

  beforeEach(async () => {
    logger = new Logger('error')
    validator = new TailwindValidator(logger)
    await validator.initialize()
    suggester = new CanonicalSuggester(validator, logger)
  })

  test('suggest canonical for z-index and break-words without touching arbitrary color', () => {
    const snippet = `<div v-if="showTooltip"
      class="absolute top-full right-0 mt-2 z-[999] bg-[#52525b] text-white px-3 py-2 rounded text-xs font-normal max-w-[90vw] w-[300px] whitespace-normal break-words shadow-lg"
      style="word-break: break-word;">
      Content
    </div>`

    const suggestions = suggester.getCanonicalSuggestionsSync(snippet, 'test.vue')
    expect(suggestions.some(s => s.original === 'z-[999]' && s.canonical === 'z-999')).toBe(true)
    expect(suggestions.some(s => s.original === 'break-words' && s.canonical === 'wrap-break-word')).toBe(true)
    expect(suggestions.some(s => s.original === 'bg-[#52525b]')).toBe(false)
  })
})
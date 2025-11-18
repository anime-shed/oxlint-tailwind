import { describe, test, expect, beforeEach } from 'bun:test'
import { CanonicalSuggester } from '../src/validators/canonical-suggester.js'
import { TailwindValidator } from '../src/validators/tailwind-validator.js'
import { Logger } from '../src/utils/logger.js'
import { TailwindLspClient } from '../src/services/tailwind-lsp-client.js'

describe('CanonicalSuggester - IntelliSense canonical cases', () => {
  let suggester: CanonicalSuggester
  let validator: TailwindValidator
  let logger: Logger
  let lsp: TailwindLspClient

  beforeEach(async () => {
    logger = new Logger('error')
    validator = new TailwindValidator(logger)
    await validator.initialize()
    lsp = new TailwindLspClient(logger)
    suggester = new CanonicalSuggester(validator, logger, lsp)
  })

  test('flex-grow -> grow', async () => {
    const s = await suggester.getCanonicalSuggestions('<div class="flex-grow">', 'test.html')
    expect(s.some(x => x.original === 'flex-grow' && x.canonical === 'grow')).toBe(true)
  })

  test('mt-[2px] -> mt-0.5', async () => {
    const s = await suggester.getCanonicalSuggestions('<div class="mt-[2px]">', 'test.html')
    expect(s.some(x => x.original === 'mt-[2px]' && x.canonical === 'mt-0.5')).toBe(true)
  })

  test('negative mt-[-20px] -> -mt-5', async () => {
    const s = await suggester.getCanonicalSuggestions('<div class="mt-[-20px]">', 'test.html')
    expect(s.some(x => x.original === 'mt-[-20px]' && x.canonical === '-mt-5')).toBe(true)
  })

  test('after:top-[2px] -> after:top-0.5', async () => {
    const s = await suggester.getCanonicalSuggestions('<div class="after:top-[2px]">', 'test.html')
    expect(s.some(x => x.original === 'after:top-[2px]' && x.canonical === 'after:top-0.5')).toBe(true)
  })

  test('!mb-0 -> mb-0!', async () => {
    const s = await suggester.getCanonicalSuggestions('<div class="!mb-0">', 'test.html')
    expect(s.some(x => x.original === '!mb-0' && x.canonical === 'mb-0!')).toBe(true)
  })

  test('z-[9999] -> z-9999', async () => {
    const s = await suggester.getCanonicalSuggestions('<div class="z-[9999]">', 'test.html')
    expect(s.some(x => x.original === 'z-[9999]' && x.canonical === 'z-9999')).toBe(true)
  })

  test('break-words -> wrap-break-word', async () => {
    const s = await suggester.getCanonicalSuggestions('<div class="break-words">', 'test.html')
    expect(s.some(x => x.original === 'break-words' && x.canonical === 'wrap-break-word')).toBe(true)
  })
})
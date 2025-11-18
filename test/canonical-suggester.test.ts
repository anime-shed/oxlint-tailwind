/**
 * Unit tests for CanonicalSuggester
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { CanonicalSuggester } from '../src/validators/canonical-suggester.js';
import { TailwindValidator } from '../src/validators/tailwind-validator.js';
import { Logger } from '../src/utils/logger.js';

describe('CanonicalSuggester', () => {
  let validator: TailwindValidator;
  let suggester: CanonicalSuggester;
  let logger: Logger;

  beforeEach(async () => {
    logger = new Logger('error');
    validator = new TailwindValidator(logger);
    await validator.initialize();
    suggester = new CanonicalSuggester(validator, logger);
  });

  describe('getCanonicalSuggestions', () => {
    test('should suggest canonical alternatives for non-canonical classes', () => {
      const input = 'text-regular font-regular margin-0 padding-0';
      const suggestions = suggester.getCanonicalSuggestions(input, 'test.html');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.original === 'text-regular')).toBe(true);
      expect(suggestions.some(s => s.canonical === 'text-base')).toBe(true);
    });

    test('should suggest American spelling for British spelling', () => {
      const input = 'text-grey bg-grey';
      const suggestions = suggester.getCanonicalSuggestions(input, 'test.html');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.original === 'text-grey')).toBe(true);
      expect(suggestions.some(s => s.canonical === 'text-gray-500')).toBe(true);
    });

    test('should suggest standard spacing values for decimals', () => {
      const input = 'm-2.5 p-1.5';
      const suggestions = suggester.getCanonicalSuggestions(input, 'test.html');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.original === 'm-2.5')).toBe(true);
      expect(suggestions.some(s => s.original === 'p-1.5')).toBe(true);
    });

    test('should suggest canonical display classes', () => {
      const input = 'display-flex display-block display-none';
      const suggestions = suggester.getCanonicalSuggestions(input, 'test.html');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.canonical === 'flex')).toBe(true);
      expect(suggestions.some(s => s.canonical === 'block')).toBe(true);
      expect(suggestions.some(s => s.canonical === 'hidden')).toBe(true);
    });

    test('should suggest canonical sizing classes', () => {
      const input = 'width-full height-full width-auto height-auto';
      const suggestions = suggester.getCanonicalSuggestions(input, 'test.html');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.canonical === 'w-full')).toBe(true);
      expect(suggestions.some(s => s.canonical === 'h-full')).toBe(true);
      expect(suggestions.some(s => s.canonical === 'w-auto')).toBe(true);
      expect(suggestions.some(s => s.canonical === 'h-auto')).toBe(true);
    });

    test('should provide descriptive reasons for suggestions', () => {
      const input = 'text-grey';
      const suggestions = suggester.getCanonicalSuggestions(input, 'test.html');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].reason).toBeTruthy();
      expect(suggestions[0].reason.length).toBeGreaterThan(0);
    });

    test('should handle input with no suggestions needed', () => {
      const input = 'flex items-center p-4 text-blue-500';
      const suggestions = suggester.getCanonicalSuggestions(input, 'test.html');
      
      expect(suggestions.length).toBe(0);
    });

    test('should handle empty input', () => {
      const suggestions = suggester.getCanonicalSuggestions('', 'test.html');
      expect(suggestions.length).toBe(0);
    });
  });

  describe('isCanonical', () => {
    test('should identify canonical classes', async () => {
      expect(await suggester.isCanonical('flex')).toBe(true);
      expect(await suggester.isCanonical('p-4')).toBe(true);
      expect(await suggester.isCanonical('text-blue-500')).toBe(true);
    });

    test('should identify non-canonical classes', async () => {
      expect(await suggester.isCanonical('text-regular')).toBe(false);
      expect(await suggester.isCanonical('font-regular')).toBe(false);
      expect(await suggester.isCanonical('margin-0')).toBe(false);
    });
  });

  describe('inline style conversion', () => {
    test('should suggest Tailwind classes for inline styles', () => {
      const input = '<div style="display: flex; justify-content: center;">';
      const suggestions = suggester.getCanonicalSuggestions(input, 'test.html');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.canonical === 'flex')).toBe(true);
      expect(suggestions.some(s => s.canonical === 'justify-center')).toBe(true);
    });

    test('should suggest Tailwind classes for common inline styles', () => {
      const input = '<div style="width: 100%; height: 100%; margin: 0 auto;">';
      const suggestions = suggester.getCanonicalSuggestions(input, 'test.html');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.canonical === 'w-full')).toBe(true);
      expect(suggestions.some(s => s.canonical === 'h-full')).toBe(true);
      expect(suggestions.some(s => s.canonical === 'mx-auto')).toBe(true);
    });
  });

  describe('anti-pattern detection', () => {
    test('should detect multiple margin classes', () => {
      const input = 'class="mt-4 mb-2 ml-1 mr-3"';
      const suggestions = suggester.getCanonicalSuggestions(input, 'test.html');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.reason.includes('spacing utilities'))).toBe(true);
    });

    test('should detect multiple text size classes', () => {
      const input = 'class="text-sm text-lg text-base"';
      const suggestions = suggester.getCanonicalSuggestions(input, 'test.html');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.reason.includes('text size classes'))).toBe(true);
    });
  });
});
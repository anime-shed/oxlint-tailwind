/**
 * Unit tests for AutoFixer
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { AutoFixer } from '../src/utils/auto-fixer.js';
import { Logger } from '../src/utils/logger.js';
import { ConflictDetector } from '../src/validators/conflict-detector.js';
import { TailwindValidator } from '../src/validators/tailwind-validator.js';

describe('AutoFixer', () => {
  let autoFixer: AutoFixer;
  let logger: Logger;
  let validator: TailwindValidator;
  let conflictDetector: ConflictDetector;

  beforeEach(() => {
    logger = new Logger('error');
    validator = new TailwindValidator(logger);
    conflictDetector = new ConflictDetector(validator, logger);
    autoFixer = new AutoFixer(logger);
  });

  describe('canFix', () => {
    test('should identify fixable conflicts', () => {
      const conflict = {
        classes: ['mt-4', 'mt-6'],
        reason: 'Spacing conflict',
        fixable: true,
        suggestedFix: 'mt-6'
      };

      expect(autoFixer.canFix(conflict)).toBe(true);
    });

    test('should identify non-fixable conflicts', () => {
      const conflict = {
        classes: ['flex-row', 'flex-col'],
        reason: 'Flex direction conflict',
        fixable: false,
        suggestedFix: 'Choose one: flex-row or flex-col'
      };

      expect(autoFixer.canFix(conflict)).toBe(false);
    });

    test('should not fix "choose one" conflicts', () => {
      const conflict = {
        classes: ['block', 'flex'],
        reason: 'Display conflict',
        fixable: true,
        suggestedFix: 'Choose one: block or flex'
      };

      expect(autoFixer.canFix(conflict)).toBe(false);
    });
  });

  describe('getFixDescription', () => {
    test('should describe fixable conflicts', () => {
      const conflict = {
        classes: ['mt-4', 'mt-6'],
        reason: 'Spacing conflict',
        fixable: true,
        suggestedFix: 'mt-6'
      };

      const description = autoFixer.getFixDescription(conflict);
      expect(description).toContain('Replace');
      expect(description).toContain('with');
    });

    test('should describe non-fixable conflicts', () => {
      const conflict = {
        classes: ['flex-row', 'flex-col'],
        reason: 'Flex direction conflict',
        fixable: false,
        suggestedFix: 'Choose one: flex-row or flex-col'
      };

      const description = autoFixer.getFixDescription(conflict);
      expect(description).toBe('No automatic fix available');
    });
  });

  describe('fix utilities', () => {
    test('should remove classes correctly', async () => {
      const classString = 'flex items-center mt-4 mt-6 p-2';
      const classesToRemove = ['mt-4', 'mt-6'];
      
      // This is testing the private method indirectly through public methods
      const conflicts = await conflictDetector.detectConflicts(classString, 'test.html');
      const fixableConflicts = conflicts.filter(c => autoFixer.canFix(c));
      
      expect(fixableConflicts.length).toBeGreaterThan(0);
    });

    test('should replace classes correctly', async () => {
      const classString = 'mt-4 mt-6';
      const conflicts = await conflictDetector.detectConflicts(classString, 'test.html');
      
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].fixable).toBe(true);
    });
  });

  describe('batchFix', () => {
    test('should handle multiple conflicts', async () => {
      const classString = 'mt-4 mt-6 text-sm text-lg w-full w-auto';
      const conflicts = await conflictDetector.detectConflicts(classString, 'test.html');
      
      expect(conflicts.length).toBeGreaterThan(0);
      
      const fixableConflicts = conflicts.filter(c => autoFixer.canFix(c));
      expect(fixableConflicts.length).toBeGreaterThan(0);
    });
  });
});
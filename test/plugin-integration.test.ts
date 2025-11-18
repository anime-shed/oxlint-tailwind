/**
 * Integration tests for the main plugin
 */

import { describe, test, expect } from 'bun:test';
import plugin from '../src/index.js';

describe('Oxlint Tailwind CSS Plugin', () => {
  test('should export plugin with correct structure', () => {
    expect(plugin).toBeDefined();
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta.name).toBe('oxlint-plugin-tailwindcss');
    expect(plugin.meta.version).toBe('1.0.0');
    expect(plugin.rules).toBeDefined();
  });

  test('should have no-conflicting-classes rule', () => {
    expect(plugin.rules['no-conflicting-classes']).toBeDefined();
    expect(plugin.rules['no-conflicting-classes'].createOnce).toBeDefined();
  });

  test('should have prefer-canonical-classes rule', () => {
    expect(plugin.rules['prefer-canonical-classes']).toBeDefined();
    expect(plugin.rules['prefer-canonical-classes'].createOnce).toBeDefined();
  });

  test('should create valid rule contexts', () => {
    const noConflictingRule = plugin.rules['no-conflicting-classes'];
    const mockContext = {
      options: [{}],
      filename: 'test.html',
      report: () => {}
    };

    const ruleContext = noConflictingRule.createOnce(mockContext);
    expect(ruleContext).toBeDefined();
    expect(ruleContext.before).toBeDefined();
    expect(ruleContext.Literal).toBeDefined();
    expect(ruleContext.TemplateLiteral).toBeDefined();
  });

  test('should create valid canonical rule contexts', () => {
    const canonicalRule = plugin.rules['prefer-canonical-classes'];
    const mockContext = {
      options: [{}],
      filename: 'test.html',
      report: () => {}
    };

    const ruleContext = canonicalRule.createOnce(mockContext);
    expect(ruleContext).toBeDefined();
    expect(ruleContext.before).toBeDefined();
    expect(ruleContext.Literal).toBeDefined();
    expect(ruleContext.TemplateLiteral).toBeDefined();
  });
});
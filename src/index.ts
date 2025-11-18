/**
 * Oxlint Plugin for Tailwind CSS Validation and Auto-fixing
 * 
 * This plugin provides comprehensive Tailwind CSS validation including:
 * - Class conflict detection
 * - Canonical class suggestions
 * - Auto-fixing for resolvable issues
 * - Support for .vue, .css, and other style files
 */

import { definePlugin } from 'oxlint';
import { AutoFixer } from './utils/auto-fixer.js';
import { Logger } from './utils/logger.js';
import { CanonicalSuggester } from './validators/canonical-suggester.js';
import { ConflictDetector } from './validators/conflict-detector.js';
import { TailwindValidator } from './validators/tailwind-validator.js';

export interface PluginOptions {
  enableAutoFix?: boolean;
  enableSuggestions?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  supportedFileTypes?: string[];
}

const DEFAULT_OPTIONS: PluginOptions = {
  enableAutoFix: true,
  enableSuggestions: true,
  logLevel: 'info',
  supportedFileTypes: ['.vue', '.css', '.scss', '.sass', '.html', '.jsx', '.tsx']
};

/**
 * Main plugin definition using oxlint's definePlugin API
 * This provides better performance compared to standard ESLint API
 */
const tailwindPlugin = definePlugin({
  meta: {
    name: 'oxlint-plugin-tailwindcss',
    version: '1.0.0',
  },
  rules: {
    /**
     * Detects and reports Tailwind CSS class conflicts
     * Auto-fixes resolvable conflicts when enabled
     */
    'no-conflicting-classes': {
      meta: { fixable: 'code' },
      createOnce(context) {
        const options = { ...DEFAULT_OPTIONS };
        const logger = new Logger(options.logLevel || 'info');
        const validator = new TailwindValidator(logger);
        const conflictDetector = new ConflictDetector(validator, logger);
        const autoFixer = options.enableAutoFix ? new AutoFixer(logger) : null;

        return {
          before() {
            logger.debug('Starting Tailwind CSS conflict detection');
          },

          /**
           * Process Literal nodes (strings) that might contain Tailwind classes
           */
          Literal(node) {
            if (typeof node.value !== 'string') return;

            const filePath = context.filename || context.getFilename?.() || 'unknown';
            const fileExt = filePath.split('.').pop()?.toLowerCase() || '';

            // Check if this file type is supported
            if (!options.supportedFileTypes?.some(ext => filePath.endsWith(ext))) {
              return;
            }

            // Only process strings that contain class/className attributes
            const originalText = (node as any).raw ?? (node as any).value;
            const containsClassAttr = /class\s*=\s*["']/.test(String(originalText)) || /className\s*=\s*["']/.test(String(originalText));
            if (!containsClassAttr) return;

            try {
              const conflicts = conflictDetector.detectConflictsSync(String(originalText), filePath);
              if (conflicts.length > 0) {
                conflicts.forEach(conflict => {
                  const message = `Tailwind CSS conflict detected: ${conflict.classes.join(' vs ')} - ${conflict.reason}`;
                  
                  if (autoFixer && conflict.fixable) {
                    // Provide auto-fix for resolvable conflicts
                    context.report({
                      node,
                      message,
                      fix(fixer) {
                        return autoFixer.fixConflict(fixer, node, conflict);
                      }
                    });
                  } else {
                    // Report as error for non-fixable conflicts
                    context.report({
                      node,
                      message: `${message} (Manual intervention required)`
                    });
                  }
                });
              }
            } catch (error) {
              const msg = error instanceof Error ? error.message : String(error);
              logger.error(`Error processing literal node: ${msg}`);
              context.report({
                node,
                message: `Tailwind CSS validation error: ${msg}`
              });
            }
          },

          /**
           * Process TemplateLiteral nodes (template strings)
           */
          async TemplateLiteral(node) {
            const filePath = context.filename || context.getFilename?.() || 'unknown';
            
            // Only process quasis (static parts) of template literals
            node.quasis.forEach((quasi, index) => {
              if (quasi.value.raw) {
                const containsClassAttr = /class\s*=\s*["']/.test(String(quasi.value.raw)) || /className\s*=\s*["']/.test(String(quasi.value.raw));
                if (!containsClassAttr) return;
                try {
                  const conflicts = conflictDetector.detectConflictsSync(quasi.value.raw, filePath);
                  
                  if (conflicts.length > 0) {
                    conflicts.forEach(conflict => {
                      const message = `Tailwind CSS conflict in template: ${conflict.classes.join(' vs ')} - ${conflict.reason}`;
                      
                      if (autoFixer && conflict.fixable) {
                        context.report({
                          node: quasi,
                          message,
                          fix(fixer) {
                            return autoFixer.fixTemplateConflict(fixer, quasi, conflict, node, index);
                          }
                        });
                      } else {
                        context.report({
                          node: quasi,
                          message: `${message} (Manual intervention required)`
                        });
                      }
                    });
                  }
                } catch (error) {
                  const msg = error instanceof Error ? error.message : String(error);
                  logger.error(`Error processing template literal: ${msg}`);
                  context.report({
                    node: quasi,
                    message: `Tailwind CSS validation error: ${msg}`
                  });
                }
              }
            });
          }
        };
      }
    },

    /**
     * Suggests canonical Tailwind CSS classes for better consistency
     */
    'prefer-canonical-classes': {
      meta: { fixable: 'code' },
      createOnce(context) {
        const options = { ...DEFAULT_OPTIONS };
        const logger = new Logger(options.logLevel || 'info');
        const validator = new TailwindValidator(logger);
        const lsp = new (require('./services/tailwind-lsp-client.js').TailwindLspClient)(logger)
        const suggester = new CanonicalSuggester(validator, logger, lsp);

        return {
          before() {
            logger.debug('Starting Tailwind CSS canonical class suggestions');
          },

          /**
           * Process Literal nodes for canonical class suggestions
           */
          async Literal(node) {
            if (typeof node.value !== 'string' || !options.enableSuggestions) return;

            const filePath = context.filename || context.getFilename?.() || 'unknown';
            
            // Check if this file type is supported
            if (!options.supportedFileTypes?.some(ext => filePath.endsWith(ext))) {
              return;
            }

            try {
              const originalText = (node as any).raw ?? (node as any).value;
              const containsClassAttr = /class\s*=\s*["']/.test(String(originalText)) || /className\s*=\s*["']/.test(String(originalText));
              if (!containsClassAttr) return;
              const suggestions = suggester.getCanonicalSuggestionsSync(String(originalText), filePath);
              suggestions.forEach(suggestion => {
                const message = `Consider using canonical class '${suggestion.canonical}' instead of '${suggestion.original}' for better consistency`;
                context.report({
                  node,
                  message,
                  fix(fixer) {
                    // Replace only inside class/className attributes
                    const replaced = String(originalText).replace(/(class(Name)?\s*=\s*["'])([^"']+)(["'])/g, (_m, p1, _p2, classes, p4) => {
                      const newClasses = classes.split(/\s+/).map(c => c === suggestion.original ? suggestion.canonical : c).join(' ');
                      return `${p1}${newClasses}${p4}`;
                    });
                    return fixer.replaceText(node, replaced);
                  }
                });
              });
            } catch (error) {
              const msg = error instanceof Error ? error.message : String(error);
              logger.error(`Error generating canonical suggestions: ${msg}`);
            }
          },

          /**
           * Process TemplateLiteral nodes for canonical class suggestions
           */
          TemplateLiteral(node) {
            if (!options.enableSuggestions) return;

            const filePath = context.filename || context.getFilename?.() || 'unknown';

            for (const [index, quasi] of node.quasis.entries()) {
              if (quasi.value.raw) {
                try {
                  const raw = String(quasi.value.raw);
                  const containsClassAttr = /class\s*=\s*["']/.test(raw) || /className\s*=\s*["']/.test(raw);
                  if (!containsClassAttr) continue;
                  const suggestions = suggester.getCanonicalSuggestionsSync(raw, filePath);
                  for (const suggestion of suggestions) {
                    const message = `Consider using canonical class '${suggestion.canonical}' instead of '${suggestion.original}' for better consistency`;
                    context.report({
                      node: quasi,
                      message,
                      fix(fixer) {
                        const newText = raw.replace(/(class(Name)?\s*=\s*["'])([^"']+)(["'])/g, (_m, p1, _p2, classes, p4) => {
                          const next = classes.split(/\s+/).map(c => c === suggestion.original ? suggestion.canonical : c).join(' ');
                          return `${p1}${next}${p4}`;
                        });
                        return fixer.replaceText(quasi, newText);
                      }
                    });
                  }
                } catch (error) {
                  const msg = error instanceof Error ? error.message : String(error);
                  logger.error(`Error generating canonical suggestions for template: ${msg}`);
                }
              }
            }
          }
        };
      }
    }
  }
});

export default tailwindPlugin;
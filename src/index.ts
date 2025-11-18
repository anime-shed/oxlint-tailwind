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
import { TailwindValidator } from './validators/tailwind-validator.js';
import { FileScanner } from './utils/file-scanner.js';
import { ConflictDetector } from './validators/conflict-detector.js';
import { CanonicalSuggester } from './validators/canonical-suggester.js';
import { AutoFixer } from './utils/auto-fixer.js';
import { Logger } from './utils/logger.js';

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
      createOnce(context) {
        const options = { ...DEFAULT_OPTIONS, ...context.options?.[0] };
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

            try {
              const conflicts = conflictDetector.detectConflicts(node.value, filePath);
              
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
              logger.error('Error processing literal node:', error);
              context.report({
                node,
                message: `Tailwind CSS validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
              });
            }
          },

          /**
           * Process TemplateLiteral nodes (template strings)
           */
          TemplateLiteral(node) {
            const filePath = context.filename || context.getFilename?.() || 'unknown';
            
            // Only process quasis (static parts) of template literals
            node.quasis.forEach((quasi, index) => {
              if (quasi.value.raw) {
                try {
                  const conflicts = conflictDetector.detectConflicts(quasi.value.raw, filePath);
                  
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
                  logger.error('Error processing template literal:', error);
                  context.report({
                    node: quasi,
                    message: `Tailwind CSS validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      createOnce(context) {
        const options = { ...DEFAULT_OPTIONS, ...context.options?.[0] };
        const logger = new Logger(options.logLevel || 'info');
        const validator = new TailwindValidator(logger);
        const suggester = new CanonicalSuggester(validator, logger);

        return {
          before() {
            logger.debug('Starting Tailwind CSS canonical class suggestions');
          },

          /**
           * Process Literal nodes for canonical class suggestions
           */
          Literal(node) {
            if (typeof node.value !== 'string' || !options.enableSuggestions) return;

            const filePath = context.filename || context.getFilename?.() || 'unknown';
            
            // Check if this file type is supported
            if (!options.supportedFileTypes?.some(ext => filePath.endsWith(ext))) {
              return;
            }

            try {
              const suggestions = suggester.getCanonicalSuggestions(node.value, filePath);
              
              suggestions.forEach(suggestion => {
                const message = `Consider using canonical class '${suggestion.canonical}' instead of '${suggestion.original}' for better consistency`;
                
                context.report({
                  node,
                  message,
                  fix(fixer) {
                    return fixer.replaceText(node, node.raw.replace(suggestion.original, suggestion.canonical));
                  }
                });
              });
            } catch (error) {
              logger.error('Error generating canonical suggestions:', error);
              // Don't report errors for suggestion failures to avoid noise
            }
          },

          /**
           * Process TemplateLiteral nodes for canonical class suggestions
           */
          TemplateLiteral(node) {
            if (!options.enableSuggestions) return;

            const filePath = context.filename || context.getFilename?.() || 'unknown';

            node.quasis.forEach((quasi, index) => {
              if (quasi.value.raw) {
                try {
                  const suggestions = suggester.getCanonicalSuggestions(quasi.value.raw, filePath);
                  
                  suggestions.forEach(suggestion => {
                    const message = `Consider using canonical class '${suggestion.canonical}' instead of '${suggestion.original}' for better consistency`;
                    
                    context.report({
                      node: quasi,
                      message,
                      fix(fixer) {
                        const newText = quasi.value.raw.replace(suggestion.original, suggestion.canonical);
                        return fixer.replaceText(quasi, newText);
                      }
                    });
                  });
                } catch (error) {
                  logger.error('Error generating canonical suggestions for template:', error);
                }
              }
            });
          }
        };
      }
    }
  }
});

export default tailwindPlugin;
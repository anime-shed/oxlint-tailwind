/**
 * Auto Fixer for Tailwind CSS issues
 * Provides automatic fixes for resolvable conflicts and suggestions
 */

import { Logger } from '../utils/logger.js';
import { ClassConflict } from '../validators/conflict-detector.js';
import { CanonicalSuggestion } from '../validators/canonical-suggester.js';

export interface FixResult {
  fixed: boolean;
  message?: string;
  error?: string;
}

export class AutoFixer {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Fix a class conflict in a Literal node
   */
  fixConflict(
    fixer: any,
    node: any,
    conflict: ClassConflict
): any {
    this.logger.debug(`Attempting to fix conflict: ${conflict.classes.join(' vs ')}`);
    
    if (!conflict.fixable || !conflict.suggestedFix) {
      this.logger.warn(`Conflict not fixable: ${conflict.reason}`);
      return null; // No fix available
    }

    try {
      const originalText = node.raw || node.value;
      let fixedText = String(originalText);

      // Apply the suggested fix
      if (!conflict.fixable) {
        // For "choose one" conflicts, we'll need to implement a more sophisticated fix
        // For now, just remove the conflicting classes
        const classesToRemove = conflict.classes;
        fixedText = this.applyRemoveInClassAttributes(fixedText, classesToRemove);
        this.logger.warn(`Removed conflicting classes: ${classesToRemove.join(', ')}`);
      } else {
        // Replace conflicting classes with the suggested fix
        const replacement = conflict.suggestedFix || '';
        // Only apply replacement if it looks like a single class token
        if (/^[^\s]+$/.test(replacement)) {
          fixedText = this.applyReplaceInClassAttributes(fixedText, conflict.classes, replacement);
        } else {
          // Fallback to removal to avoid injecting messages into code
          fixedText = this.applyRemoveInClassAttributes(fixedText, conflict.classes);
        }
      }

      if (fixedText !== originalText) {
        this.logger.info(`Fixed conflict: ${conflict.classes.join(' vs ')} -> ${conflict.suggestedFix}`);
        return fixer.replaceText(node, fixedText);
      }
    } catch (error) {
      this.logger.error('Error fixing conflict:', error);
    }

    return null;
  }

  /**
   * Fix a class conflict in a TemplateLiteral quasi
   */
  fixTemplateConflict(
    fixer: any,
    quasi: any,
    conflict: ClassConflict,
    templateLiteral: any,
    quasiIndex: number
  ): any {
    this.logger.debug(`Attempting to fix template conflict: ${conflict.classes.join(' vs ')}`);
    
    if (!conflict.fixable || !conflict.suggestedFix) {
      return null;
    }

    try {
      const originalText = quasi.value.raw;
      let fixedText = originalText;

      if (conflict.suggestedFix.includes('Choose one:')) {
        const classesToRemove = conflict.classes;
        fixedText = this.removeClasses(originalText, classesToRemove);
      } else {
        fixedText = this.replaceClasses(originalText, conflict.classes, conflict.suggestedFix);
      }

      if (fixedText !== originalText) {
        // For template literals, we need to be more careful
        // We'll replace the entire quasi value
        return fixer.replaceText(quasi, fixedText);
      }
    } catch (error) {
      this.logger.error('Error fixing template conflict:', error);
    }

    return null;
  }

  /**
   * Fix canonical suggestions
   */
  fixCanonicalSuggestion(
    fixer: any,
    node: any,
    suggestion: CanonicalSuggestion
  ): any {
    this.logger.debug(`Fixing canonical suggestion: ${suggestion.original} -> ${suggestion.canonical}`);
    
    try {
      const originalText = node.raw || node.value;
      const fixedText = originalText.replace(suggestion.original, suggestion.canonical);
      
      if (fixedText !== originalText) {
        this.logger.info(`Applied canonical fix: ${suggestion.original} -> ${suggestion.canonical}`);
        return fixer.replaceText(node, fixedText);
      }
    } catch (error) {
      this.logger.error('Error fixing canonical suggestion:', error);
    }
    
    return null;
  }

  /**
   * Remove specific classes from a class string
   */
  private removeClasses(classString: string, classesToRemove: string[]): string {
    const classes = classString.split(/\s+/);
    const filteredClasses = classes.filter(cls => !classesToRemove.includes(cls));
    return filteredClasses.join(' ');
  }

  private applyRemoveInClassAttributes(input: string, classesToRemove: string[]): string {
    return this.transformClassAttributes(input, (classValue) => {
      const tokens = classValue.split(/\s+/).filter(Boolean);
      const filtered = tokens.filter(t => !classesToRemove.includes(t));
      return filtered.join(' ');
    });
  }

  private applyReplaceInClassAttributes(input: string, classesToReplace: string[], replacement: string): string {
    return this.transformClassAttributes(input, (classValue) => {
      const tokens = classValue.split(/\s+/).filter(Boolean);
      const filtered = tokens.filter(t => !classesToReplace.includes(t));
      if (!filtered.includes(replacement)) filtered.push(replacement);
      return filtered.join(' ');
    });
  }

  private transformClassAttributes(input: string, transform: (classValue: string) => string): string {
    // Handle class="..." and className="..."
    const patterns = [/class\s*=\s*(["'])([^"']+)(["'])/g, /className\s*=\s*(["'])([^"']+)(["'])/g];
    let output = input;
    for (const pattern of patterns) {
      output = output.replace(pattern, (_m, quoteStart, classVal, quoteEnd) => {
        const newVal = transform(classVal);
        return `class=${quoteStart}${newVal}${quoteEnd}`;
      });
    }
    return output;
  }

  /**
   * Replace classes with a new value
   */
  private replaceClasses(classString: string, classesToReplace: string[], replacement: string): string {
    // Remove the conflicting classes and add the replacement
    let result = this.removeClasses(classString, classesToReplace);
    
    if (replacement && replacement !== 'Choose one:') {
      // Add the replacement class if it's not already present
      const resultClasses = result.split(/\s+/).filter(Boolean);
      if (!resultClasses.includes(replacement)) {
        resultClasses.push(replacement);
        result = resultClasses.join(' ');
      }
    }
    
    return result.trim();
  }

  /**
   * Check if a fix can be safely applied
   */
  canFix(conflict: ClassConflict): boolean {
    if (!conflict.fixable) {
      return false;
    }

    // Additional safety checks
    if (conflict.suggestedFix && conflict.suggestedFix.includes('Choose one:')) {
      // For "choose one" conflicts, we can't auto-fix without more context
      return false;
    }

    return true;
  }

  /**
   * Generate a fix description for logging
   */
  getFixDescription(conflict: ClassConflict): string {
    if (!conflict.fixable) {
      return 'No automatic fix available';
    }

    if (conflict.suggestedFix) {
      return `Replace ${conflict.classes.join(' and ')} with ${conflict.suggestedFix}`;
    }

    return 'Automatic fix available';
  }

  /**
   * Batch fix multiple conflicts
   */
  batchFix(fixer: any, node: any, conflicts: ClassConflict[]): any[] {
    const fixes: any[] = [];
    
    conflicts.forEach(conflict => {
      if (this.canFix(conflict)) {
        const fix = this.fixConflict(fixer, node, conflict);
        if (fix) {
          fixes.push(fix);
        }
      }
    });
    
    return fixes;
  }
}
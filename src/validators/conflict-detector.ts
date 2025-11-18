/**
 * Conflict Detector for Tailwind CSS classes
 * Identifies conflicting classes that would override each other
 * Uses pattern-based detection when CSS properties are unavailable
 */

import { Logger } from '../utils/logger.js';
import { TailwindValidator } from './tailwind-validator.js';

export interface ClassConflict {
  classes: string[];
  reason: string;
  fixable: boolean;
  suggestedFix?: string;
}

export class ConflictDetector {
  private validator: TailwindValidator;
  private logger: Logger;

  constructor(validator: TailwindValidator, logger: Logger) {
    this.validator = validator;
    this.logger = logger;
  }

  /**
   * Detect conflicts in a string that may contain Tailwind CSS classes
   */
  async detectConflicts(input: string, filePath: string): Promise<ClassConflict[]> {
    this.logger.debug(`Detecting conflicts in: ${input.substring(0, 50)}...`);
    
    const classes = this.validator.extractClasses(input);
    this.logger.debug(`Found ${classes.length} potential Tailwind classes`);
    
    if (classes.length < 2) {
      return []; // Need at least 2 classes to have a conflict
    }

    const conflicts: ClassConflict[] = [];
    
    // Check each pair of classes for conflicts
    for (let i = 0; i < classes.length; i++) {
      for (let j = i + 1; j < classes.length; j++) {
        const class1 = classes[i];
        const class2 = classes[j];
        
        // Skip conflicts between responsive variants (they don't conflict)
        if (this.areResponsiveVariants(class1, class2)) {
          continue;
        }
        
        try {
          const conflict = await this.checkConflict(class1, class2);
          if (conflict) {
            conflicts.push(conflict);
          }
        } catch (error) {
          this.logger.warn(`Failed to check conflict between ${class1} and ${class2}: ${error instanceof Error ? error.message : String(error)}`);
          // Continue with other class pairs even if one fails
        }
      }
    }

    this.logger.debug(`Found ${conflicts.length} conflicts`);
    return conflicts;
  }

  detectConflictsSync(input: string, filePath: string): ClassConflict[] {
    this.logger.debug(`Detecting conflicts in: ${input.substring(0, 50)}...`)
    const classes = this.validator.extractClasses(input)
    this.logger.debug(`Found ${classes.length} potential Tailwind classes`)
    if (classes.length < 2) {
      return []
    }
    const conflicts: ClassConflict[] = []
    for (let i = 0; i < classes.length; i++) {
      for (let j = i + 1; j < classes.length; j++) {
        const class1 = classes[i]
        const class2 = classes[j]
        if (this.areResponsiveVariants(class1, class2)) {
          continue
        }
        const conflict = this.checkPatternConflict(class1, class2)
        if (conflict) conflicts.push(conflict)
      }
    }
    this.logger.debug(`Found ${conflicts.length} conflicts`)
    return conflicts
  }

  /**
   * Check if two classes conflict with each other
   */
  private async checkConflict(class1: string, class2: string): Promise<ClassConflict | null> {
    try {
      // Get CSS properties for both classes
      const props1 = await this.validator.getCSSProperties(class1);
      const props2 = await this.validator.getCSSProperties(class2);

      // If we have CSS properties, use them for conflict detection
      if (props1.length > 0 && props2.length > 0) {
        const conflictingProps = this.findConflictingProperties(props1, props2);
        
        if (conflictingProps.length > 0) {
          return {
            classes: [class1, class2],
            reason: `Conflicting CSS properties: ${conflictingProps.join(', ')}`,
            fixable: true,
            suggestedFix: `Remove one of the conflicting classes: ${class1} or ${class2}`
          };
        }
        
        return null;
      }
    } catch (error) {
      this.logger.debug(`CSS property detection failed for ${class1} or ${class2}, falling back to pattern detection`);
    }

    // Fall back to pattern-based detection
    return this.checkPatternConflict(class1, class2);
  }

  /**
   * Check for conflicts using pattern matching when CSS properties are unavailable
   */
  private checkPatternConflict(class1: string, class2: string): ClassConflict | null {
    // Check for spacing conflicts
    const spacingConflict = this.checkSpacingConflict(class1, class2);
    if (spacingConflict) return spacingConflict;

    // Check for sizing conflicts
    const sizingConflict = this.checkSizingConflict(class1, class2);
    if (sizingConflict) return sizingConflict;

    // Check for typography conflicts
    const typographyConflict = this.checkTypographyConflict(class1, class2);
    if (typographyConflict) return typographyConflict;

    // Check for color conflicts
    const colorConflict = this.checkColorConflict(class1, class2);
    if (colorConflict) return colorConflict;

    // Check for layout conflicts
    const layoutConflict = this.checkLayoutConflict(class1, class2);
    if (layoutConflict) return layoutConflict;

    return null;
  }

  /**
   * Find conflicting CSS properties between two sets
   */
  private findConflictingProperties(props1: string[], props2: string[]): string[] {
    const conflicting: string[] = [];
    
    for (const prop1 of props1) {
      const propName1 = prop1.split(':')[0].trim();
      
      for (const prop2 of props2) {
        const propName2 = prop2.split(':')[0].trim();
        
        if (propName1 === propName2) {
          conflicting.push(propName1);
        }
      }
    }
    
    return conflicting;
  }

  /**
   * Check for spacing conflicts (margin, padding)
   */
  private checkSpacingConflict(class1: string, class2: string): ClassConflict | null {
    const spacingPattern = /^(m|p)(t|b|l|r|x|y)?-\d+$/;
    
    if (!spacingPattern.test(class1) || !spacingPattern.test(class2)) {
      return null;
    }

    // Extract spacing type and direction
    const match1 = class1.match(spacingPattern);
    const match2 = class2.match(spacingPattern);
    
    if (!match1 || !match2) return null;

    const type1 = match1[1]; // m or p
    const type2 = match2[1]; // m or p
    const dir1 = match1[2] || ''; // t, b, l, r, x, y, or empty
    const dir2 = match2[2] || ''; // t, b, l, r, x, y, or empty

    // Same type and direction = conflict
    if (type1 === type2 && dir1 === dir2) {
      return {
        classes: [class1, class2],
        reason: `Conflicting ${type1 === 'm' ? 'margin' : 'padding'} values for same direction`,
        fixable: true,
        suggestedFix: `Keep only one: ${class1} or ${class2}`
      };
    }

    return null;
  }

  /**
   * Check for sizing conflicts (width, height)
   */
  private checkSizingConflict(class1: string, class2: string): ClassConflict | null {
    const sizingPattern = /^(w|h)-\d+|(w|h)-(auto|full|screen)$/;
    
    if (!sizingPattern.test(class1) || !sizingPattern.test(class2)) {
      return null;
    }

    const type1 = class1.startsWith('w-') ? 'w' : class1.startsWith('h-') ? 'h' : null;
    const type2 = class2.startsWith('w-') ? 'w' : class2.startsWith('h-') ? 'h' : null;

    if (type1 && type2 && type1 === type2) {
      return {
        classes: [class1, class2],
        reason: `Conflicting ${type1 === 'w' ? 'width' : 'height'} values`,
        fixable: true,
        suggestedFix: `Keep only one: ${class1} or ${class2}`
      };
    }

    return null;
  }

  /**
   * Check for typography conflicts
   */
  private checkTypographyConflict(class1: string, class2: string): ClassConflict | null {
    const isSize = (cls: string) => /^(text)-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/.test(cls);
    const isColor = (cls: string) => /^(text)-(transparent|current|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/.test(cls) || /^text-\[[^\]]+\]$/.test(cls);

    // Font size conflicts (size vs size only)
    if (isSize(class1) && isSize(class2)) {
      return {
        classes: [class1, class2],
        reason: 'Conflicting font size values',
        fixable: false
      };
    }

    // Font weight conflicts
    if (class1.startsWith('font-') && class2.startsWith('font-')) {
      return {
        classes: [class1, class2],
        reason: 'Conflicting font weight values',
        fixable: false
      };
    }

    // Line height conflicts
    if (class1.startsWith('leading-') && class2.startsWith('leading-')) {
      return {
        classes: [class1, class2],
        reason: 'Conflicting line height values',
        fixable: false
      };
    }

    // Letter spacing conflicts
    if (class1.startsWith('tracking-') && class2.startsWith('tracking-')) {
      return {
        classes: [class1, class2],
        reason: 'Conflicting letter spacing values',
        fixable: false
      };
    }

    return null;
  }

  /**
   * Check for color conflicts
   */
  private checkColorConflict(class1: string, class2: string): ClassConflict | null {
    const isColor = (cls: string) => /^(text)-(transparent|current|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/.test(cls) || /^text-\[[^\]]+\]$/.test(cls);

    // Text color conflicts (color vs color only)
    if (isColor(class1) && isColor(class2)) {
      return {
        classes: [class1, class2],
        reason: 'Conflicting text color values',
        fixable: false
      };
    }

    // Background color conflicts
    if (class1.startsWith('bg-') && class2.startsWith('bg-')) {
      return {
        classes: [class1, class2],
        reason: 'Conflicting background color values',
        fixable: false
      };
    }

    // Border color conflicts
    if (class1.startsWith('border-') && class2.startsWith('border-')) {
      return {
        classes: [class1, class2],
        reason: 'Conflicting border color values',
        fixable: false
      };
    }

    return null;
  }

  /**
   * Check for layout conflicts
   */
  private checkLayoutConflict(class1: string, class2: string): ClassConflict | null {
    // Display conflicts
    const displayClasses = ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'flow-root', 'hidden'];
    if (displayClasses.includes(class1) && displayClasses.includes(class2)) {
      return {
        classes: [class1, class2],
        reason: 'Conflicting display values',
        fixable: false
      };
    }

    // Position conflicts
    const positionClasses = ['static', 'fixed', 'absolute', 'relative', 'sticky'];
    if (positionClasses.includes(class1) && positionClasses.includes(class2)) {
      return {
        classes: [class1, class2],
        reason: 'Conflicting position values',
        fixable: false
      };
    }

    return null;
  }

  /**
   * Check if two classes are responsive variants that don't conflict
   */
  private areResponsiveVariants(class1: string, class2: string): boolean {
    // Get responsive prefixes
    const prefix1 = this.getResponsivePrefix(class1);
    const prefix2 = this.getResponsivePrefix(class2);
    
    this.logger.debug(`Checking responsive variants: ${class1} (prefix: ${prefix1}) vs ${class2} (prefix: ${prefix2})`);
    
    // Remove responsive prefixes to get the base class
    const base1 = this.removeResponsivePrefix(class1);
    const base2 = this.removeResponsivePrefix(class2);
    
    this.logger.debug(`Base classes: ${base1} vs ${base2}`);
    
    // Check if they are the same property type (e.g., both margin-top classes)
    const property1 = this.getPropertyType(base1);
    const property2 = this.getPropertyType(base2);
    
    this.logger.debug(`Property types: ${property1} vs ${property2}`);
    
    // If they are the same property type but have different responsive prefixes,
    // they are responsive variants and don't conflict
    const samePropertyType = property1 === property2 && property1 !== null;
    const hasDifferentPrefixes = prefix1 !== prefix2;
    
    const result = samePropertyType && hasDifferentPrefixes;
    this.logger.debug(`Responsive variants result: ${result} (same property: ${samePropertyType}, different prefixes: ${hasDifferentPrefixes})`);
    return result;
  }

  /**
   * Get the property type from a class name (e.g., 'mt-4' -> 'mt')
   */
  private getPropertyType(className: string): string | null {
    // Extract the property part before the value
    // e.g., 'mt-4' -> 'mt', 'p-2' -> 'p', 'text-sm' -> 'text'
    const match = className.match(/^([a-z-]+)(?:-[a-z0-9-]+)?$/);
    return match ? match[1] : null;
  }

  /**
   * Get responsive prefix from a class
   */
  private getResponsivePrefix(className: string): string | null {
    const responsivePrefixes = ['sm:', 'md:', 'lg:', 'xl:', '2xl:'];
    
    for (const prefix of responsivePrefixes) {
      if (className.startsWith(prefix)) {
        return prefix;
      }
    }
    
    return null;
  }

  /**
   * Remove responsive prefix from a class
   */
  private removeResponsivePrefix(className: string): string {
    const prefix = this.getResponsivePrefix(className);
    return prefix ? className.slice(prefix.length) : className;
  }
}
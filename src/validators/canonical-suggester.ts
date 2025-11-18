/**
 * Canonical Suggester for Tailwind CSS classes
 * Provides suggestions for canonical class names to improve consistency
 */

import { Logger } from '../utils/logger.js';
import { TailwindValidator } from './tailwind-validator.js';

export interface CanonicalSuggestion {
  original: string;
  canonical: string;
  reason: string;
}

export class CanonicalSuggester {
  private validator: TailwindValidator;
  private logger: Logger;
  private canonicalMappings: Map<string, string>;

  constructor(validator: TailwindValidator, logger: Logger) {
    this.validator = validator;
    this.logger = logger;
    this.canonicalMappings = new Map();
    this.initializeCanonicalMappings();
  }

  /**
   * Initialize canonical class mappings
   */
  private initializeCanonicalMappings(): void {
    this.logger.debug('Initializing canonical class mappings');

    // Common non-canonical to canonical mappings
    const mappings: Record<string, string> = {
      // Typography
      'text-regular': 'text-base',
      'text-normal': 'text-base',
      'font-regular': 'font-normal',
      'font-standard': 'font-normal',
      'weight-normal': 'font-normal',
      'weight-bold': 'font-bold',
      
      // Spacing
      'margin-0': 'm-0',
      'margin-1': 'm-1',
      'margin-2': 'm-2',
      'padding-0': 'p-0',
      'padding-1': 'p-1',
      'padding-2': 'p-2',
      
      // Layout
      'display-block': 'block',
      'display-inline': 'inline',
      'display-flex': 'flex',
      'display-grid': 'grid',
      'display-none': 'hidden',
      
      // Sizing
      'width-full': 'w-full',
      'width-auto': 'w-auto',
      'height-full': 'h-full',
      'height-auto': 'h-auto',
      
      // Colors (common mistakes)
      'text-grey': 'text-gray-500',
      'bg-grey': 'bg-gray-500',
      'border-grey': 'border-gray-500',
      
      // Responsive
      'mobile': 'sm',
      'tablet': 'md',
      'desktop': 'lg',
      
      // State
      'hover-bg': 'hover:bg',
      'focus-bg': 'focus:bg',
      'active-bg': 'active:bg',
      'hover-text': 'hover:text',
      'focus-text': 'focus:text'
    };

    Object.entries(mappings).forEach(([nonCanonical, canonical]) => {
      this.canonicalMappings.set(nonCanonical, canonical);
    });

    this.logger.debug(`Initialized ${this.canonicalMappings.size} canonical mappings`);
  }

  /**
   * Get canonical suggestions for classes in a string
   */
  getCanonicalSuggestions(input: string, filePath: string): CanonicalSuggestion[] {
    this.logger.debug(`Generating canonical suggestions for: ${input.substring(0, 50)}...`);
    
    // First extract classes, then process them
    const classes = this.extractClassesFromInput(input);
    const suggestions: CanonicalSuggestion[] = [];

    classes.forEach(className => {
      const suggestion = this.getCanonicalSuggestion(className);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    });

    // Check for patterns that suggest non-canonical usage
    const patternSuggestions = this.getPatternBasedSuggestions(input);
    suggestions.push(...patternSuggestions);

    this.logger.debug(`Generated ${suggestions.length} canonical suggestions`);
    return suggestions;
  }

  /**
   * Extract classes from input string, including non-Tailwind classes for suggestion
   */
  private extractClassesFromInput(input: string): string[] {
    // Match class attribute content or standalone class names
    const classPattern = /\b([a-z]+(?:-[a-z0-9-\.]+)*)/g;
    const matches = input.match(classPattern) || [];
    
    // Filter out obvious non-class strings but keep potential non-canonical classes
    return matches.filter(className => {
      // Keep anything that looks like a class, even if not a valid Tailwind class
      return className.length > 1 && className.length < 50;
    });
  }

  /**
   * Get canonical suggestion for a single class
   */
  private getCanonicalSuggestion(className: string): CanonicalSuggestion | null {
    // Check direct mappings
    const canonical = this.canonicalMappings.get(className);
    if (canonical) {
      return {
        original: className,
        canonical,
        reason: `Use canonical Tailwind class instead of non-standard '${className}'`
      };
    }

    // Check for common patterns
    return this.getPatternBasedSuggestion(className);
  }

  /**
   * Get pattern-based suggestions
   */
  private getPatternBasedSuggestion(className: string): CanonicalSuggestion | null {
    // Check for numeric values that should be standardized
    const numericMatch = className.match(/^(m|p|mt|mr|mb|ml|mx|my|pt|pr|pb|pl|px|py)-(\d+\.\d+)$/);
    if (numericMatch) {
      const [, prefix, decimalValue] = numericMatch;
      const decimal = parseFloat(decimalValue);
      
      // Round to nearest valid Tailwind value
      const roundedValue = this.roundToNearestValidValue(decimal, prefix);
      // Always suggest rounding for decimal values, even if they're "valid"
      if (roundedValue !== decimalValue || decimalValue.includes('.')) {
        const canonical = `${prefix}-${roundedValue}`;
        // Don't check if it's valid - just suggest the canonical form
        return {
          original: className,
          canonical,
          reason: `Use standard Tailwind spacing value instead of decimal '${decimalValue}'`
        };
      }
    }

    // Check for British spelling vs American spelling
    const britishToAmerican: Record<string, string> = {
      'grey': 'gray',
      'centre': 'center',
      'colour': 'color'
    };

    for (const [british, american] of Object.entries(britishToAmerican)) {
      if (className.includes(british)) {
        const canonical = className.replace(british, american);
        // Don't check if it's valid - just suggest the canonical form
        return {
          original: className,
          canonical,
          reason: `Use American spelling '${american}' instead of British spelling '${british}'`
        };
      }
    }

    return null;
  }

  /**
   * Get pattern-based suggestions for the entire input string
   */
  private getPatternBasedSuggestions(input: string): CanonicalSuggestion[] {
    const suggestions: CanonicalSuggestion[] = [];

    // Check for inline style patterns that should be Tailwind classes
    const inlineStylePattern = /style\s*=\s*["']([^"']+)["']/g;
    let match;
    
    while ((match = inlineStylePattern.exec(input)) !== null) {
      const styleContent = match[1];
      const styleSuggestions = this.convertInlineStylesToTailwind(styleContent);
      suggestions.push(...styleSuggestions);
    }

    // Check for common anti-patterns
    const antiPatterns = [
      {
        pattern: /class\s*=\s*["'][^"']*\b(mr|ml|mt|mb|mx|my)-\d+\s+[^"']*\b(mr|ml|mt|mb|mx|my)-\d+[^"']*["']/g,
        message: 'Consider using more specific spacing utilities instead of multiple margin classes'
      },
      {
        pattern: /class\s*=\s*["'][^"']*\btext-\w+\s+[^"']*\btext-\w+[^"']*["']/g,
        message: 'Avoid multiple text size classes, use the most appropriate one'
      }
    ];

    antiPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(input)) {
        suggestions.push({
          original: input.match(pattern)?.[0] || input,
          canonical: input, // Keep original but add suggestion
          reason: message
        });
      }
    });

    return suggestions;
  }

  /**
   * Round decimal values to nearest valid Tailwind values
   */
  private roundToNearestValidValue(decimal: number, prefix: string): string {
    const validValues = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];
    
    let closest = validValues[0];
    let minDiff = Math.abs(decimal - closest);
    
    for (const value of validValues) {
      const diff = Math.abs(decimal - value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = value;
      }
    }
    
    // Return as string, handling .0 case
    return closest % 1 === 0 ? String(closest) : String(closest);
  }

  /**
   * Convert inline styles to Tailwind class suggestions
   */
  private convertInlineStylesToTailwind(styleContent: string): CanonicalSuggestion[] {
    const suggestions: CanonicalSuggestion[] = [];
    
    // Common inline style to Tailwind mappings
    const styleToTailwind: Record<string, string> = {
      'display: flex': 'flex',
      'display: block': 'block',
      'display: none': 'hidden',
      'text-align: center': 'text-center',
      'text-align: left': 'text-left',
      'text-align: right': 'text-right',
      'justify-content: center': 'justify-center',
      'justify-content: space-between': 'justify-between',
      'align-items: center': 'items-center',
      'margin: 0 auto': 'mx-auto',
      'width: 100%': 'w-full',
      'height: 100%': 'h-full'
    };

    for (const [style, tailwindClass] of Object.entries(styleToTailwind)) {
      if (styleContent.includes(style)) {
        suggestions.push({
          original: `style="${styleContent}"`,
          canonical: tailwindClass,
          reason: `Use Tailwind class '${tailwindClass}' instead of inline style '${style}'`
        });
      }
    }

    return suggestions;
  }

  /**
   * Check if a class is canonical
   */
  async isCanonical(className: string): Promise<boolean> {
    // If it's in our mappings as a canonical value, it's canonical
    const isCanonicalMapping = Array.from(this.canonicalMappings.values()).includes(className);
    if (isCanonicalMapping) {
      return true;
    }

    // If it's a valid Tailwind class and not in the non-canonical mappings, it's likely canonical
    const isValidTailwind = await this.validator.isTailwindClass(className);
    if (isValidTailwind) {
      // Check if it's in the non-canonical keys
      const isNonCanonical = this.canonicalMappings.has(className);
      return !isNonCanonical;
    }

    return false;
  }
}
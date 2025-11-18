/**
 * Canonical Suggester for Tailwind CSS classes
 * Provides suggestions for canonical class names to improve consistency
 */

import { Logger } from '../utils/logger.js';
import { TailwindValidator } from './tailwind-validator.js';
import { TailwindLspClient } from '../services/tailwind-lsp-client.js'

export interface CanonicalSuggestion {
  original: string;
  canonical: string;
  reason: string;
}

export class CanonicalSuggester {
  private validator: TailwindValidator;
  private logger: Logger;
  private lsp?: TailwindLspClient

  constructor(validator: TailwindValidator, logger: Logger, lsp?: TailwindLspClient) {
    this.validator = validator;
    this.logger = logger;
    this.lsp = lsp
  }

  /**
   * Get canonical suggestions for classes in a string
   */
  async getCanonicalSuggestions(input: string, filePath: string): Promise<CanonicalSuggestion[]> {
    const classes = this.extractClassesFromInput(input)
    const suggestions: CanonicalSuggestion[] = []
    if (this.lsp) {
      const uri = `file://${filePath}`
      try {
        const languageId = filePath.endsWith('.vue') ? 'vue' : filePath.endsWith('.tsx') ? 'typescriptreact' : filePath.endsWith('.jsx') ? 'javascriptreact' : filePath.endsWith('.html') ? 'html' : 'plaintext'
        const d = await this.lsp.getCanonicalDiagnostics(input, uri, languageId)
        suggestions.push(...this.mapDiagnosticsToSuggestions(d))
      } catch {}
    }
    classes.forEach(className => {
      const s = this.getCanonicalSuggestion(className)
      if (s) suggestions.push(s)
    })
    const patternSuggestions = this.getPatternBasedSuggestions(input)
    suggestions.push(...patternSuggestions)
    return suggestions
  }

  getCanonicalSuggestionsSync(input: string, filePath: string): CanonicalSuggestion[] {
    const classes = this.extractClassesFromInput(input)
    const suggestions: CanonicalSuggestion[] = []
    classes.forEach(className => {
      const s = this.getCanonicalSuggestion(className)
      if (s) suggestions.push(s)
    })
    const patternSuggestions = this.getPatternBasedSuggestions(input)
    suggestions.push(...patternSuggestions)
    return suggestions
  }

  /**
   * Extract classes from input string, including non-Tailwind classes for suggestion
   */
  private extractClassesFromInput(input: string): string[] {
    const classes: string[] = []
    const attrRegex = /(class(?:Name)?\s*=\s*["'])([^"']+)(["'])/g
    let m: RegExpExecArray | null
    while ((m = attrRegex.exec(input)) !== null) {
      const content = m[2]
      content.split(/\s+/).filter(Boolean).forEach(tok => classes.push(tok))
    }

    // Fallback: standalone tokens (keep broader match including variants, brackets, and '!')
    if (classes.length === 0) {
      input.split(/\s+/).filter(Boolean).forEach(tok => {
        const cleaned = tok.replace(/["'<>]/g, '')
        if (/^[!]?((?:[a-z-]+:)*)?[a-z-]+(?:-(?:\[[^\]]+\]|[a-z0-9\.]+))!?$/.test(cleaned)) {
          classes.push(cleaned)
        }
      })
    }

    return classes
  }

  /**
   * Get canonical suggestion for a single class
   */
  private getCanonicalSuggestion(className: string): CanonicalSuggestion | null {
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

    // Important modifier canonicalization: leading '!' becomes trailing '!'
    if (/^!([a-z0-9:-]+)$/.test(className)) {
      const base = className.slice(1)
      return { original: className, canonical: `${base}!`, reason: 'Use trailing ! for important modifier' }
    }

    const disp = className.match(/^((?:[a-z-]+:)*)display-(block|inline|flex|grid|none)$/)
    if (disp) {
      const pref = disp[1] || ''
      const val = disp[2]
      const map: Record<string,string> = { block: 'block', inline: 'inline', flex: 'flex', grid: 'grid', none: 'hidden' }
      return { original: className, canonical: `${pref}${map[val]}`.replace(/:$/,''), reason: 'Use canonical display utility' }
    }

    const width = className.match(/^((?:[a-z-]+:)*)width-(full|auto)$/)
    if (width) {
      const pref = width[1] || ''
      const val = width[2]
      return { original: className, canonical: `${pref}w-${val}`.replace(/:$/,''), reason: 'Use w-* sizing utility' }
    }
    const height = className.match(/^((?:[a-z-]+:)*)height-(full|auto)$/)
    if (height) {
      const pref = height[1] || ''
      const val = height[2]
      return { original: className, canonical: `${pref}h-${val}`.replace(/:$/,''), reason: 'Use h-* sizing utility' }
    }

    const margin = className.match(/^((?:[a-z-]+:)*)margin-(\d+)$/)
    if (margin) {
      const pref = margin[1] || ''
      const num = margin[2]
      return { original: className, canonical: `${pref}m-${num}`.replace(/:$/,''), reason: 'Use m-* spacing utility' }
    }
    const padding = className.match(/^((?:[a-z-]+:)*)padding-(\d+)$/)
    if (padding) {
      const pref = padding[1] || ''
      const num = padding[2]
      return { original: className, canonical: `${pref}p-${num}`.replace(/:$/,''), reason: 'Use p-* spacing utility' }
    }

    const flexGrow = className.match(/^((?:[a-z-]+:)*)flex-grow$/)
    if (flexGrow) {
      const pref = flexGrow[1] || ''
      return { original: className, canonical: `${pref}grow`.replace(/:$/,''), reason: 'Use grow instead of flex-grow' }
    }

    const breakWords = className.match(/^((?:[a-z-]+:)*)break-words$/)
    if (breakWords) {
      const pref = breakWords[1] || ''
      return { original: className, canonical: `${pref}wrap-break-word`.replace(/:$/,''), reason: 'Use wrap-break-word instead of break-words' }
    }

    const britishGrey = className.match(/^((?:[a-z-]+:)*)((text|bg|border)-)grey$/)
    if (britishGrey) {
      const pref = britishGrey[1] || ''
      const preUtil = britishGrey[2]
      const canonical = `${pref}${preUtil}gray-500`.replace(/:$/,'')
      return { original: className, canonical, reason: 'Use American spelling gray and provide a standard shade' }
    }

    const textRegular = className.match(/^((?:[a-z-]+:)*)text-(regular|normal)$/)
    if (textRegular) {
      const pref = textRegular[1] || ''
      return { original: className, canonical: `${pref}text-base`.replace(/:$/,''), reason: 'Use text-base for regular text' }
    }

    const fontRegular = className.match(/^((?:[a-z-]+:)*)font-(regular|standard)$/)
    if (fontRegular) {
      const pref = fontRegular[1] || ''
      return { original: className, canonical: `${pref}font-normal`.replace(/:$/,''), reason: 'Use font-normal for regular weight' }
    }

    // z-index numeric arbitrary -> canonical numeric (remove brackets)
    const zArb = className.match(/^(?<prefix>(?:[a-z-]+:)*)z-\[(?<num>-?[0-9]+)\]$/)
    if (zArb && (zArb.groups as any)?.num) {
      const num = (zArb.groups as any).num
      const pref = (zArb.groups as any).prefix || ''
      return { original: className, canonical: `${pref}z-${num}`.replace(/:$/,''), reason: 'Use canonical numeric z-index without brackets' }
    }

    // Convert arbitrary px to scale tokens for spacing/inset e.g., mt-[2px] -> mt-0.5, -mt-[20px] -> -mt-5
    const pxToScale = (px: number) => {
      const value = px / 4
      const allowed = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10]
      let best = allowed[0], diff = Math.abs(value - best)
      for (const v of allowed) { const d = Math.abs(value - v); if (d < diff) { diff = d; best = v } }
      return best % 1 === 0 ? String(best) : String(best)
    }

    const pxSpacing = className.match(/^(?<prefix>(?:[a-z-]+:)*)?(?<neg>-)?(?<prop>m|p|mt|mr|mb|ml|mx|my|pt|pr|pb|pl|px|py|top|left|right|bottom|inset)-\[(?<px>-?[0-9]+)px\]$/)
    if (pxSpacing && (pxSpacing.groups as any)?.px) {
      const px = Number((pxSpacing.groups as any).px)
      const neg = (pxSpacing.groups as any).neg ? '-' : ''
      const prop = (pxSpacing.groups as any).prop
      const pref = (pxSpacing.groups as any).prefix || ''
      const scale = pxToScale(Math.abs(px))
      const sign = (px < 0 || neg) ? '-' : ''
      return { original: className, canonical: `${pref}${sign}${prop}-${scale}`.replace(/:$/,''), reason: 'Use scale token instead of arbitrary px value' }
    }

    // Pseudo variants with arbitrary px e.g., after:top-[2px] -> after:top-0.5
    const pseudoPx = className.match(/^(?<prefix>(?:[a-z-]+:)*)?(?<pseudo>before|after):(?<prop>top|left|right|bottom|inset)-\[(?<px>-?[0-9]+)px\]$/)
    if (pseudoPx && (pseudoPx.groups as any)?.px) {
      const px = Number((pseudoPx.groups as any).px)
      const pref = (pseudoPx.groups as any).prefix || ''
      const pseudo = (pseudoPx.groups as any).pseudo
      const prop = (pseudoPx.groups as any).prop
      const scale = pxToScale(Math.abs(px))
      const sign = px < 0 ? '-' : ''
      return { original: className, canonical: `${pref}${pseudo}:${sign}${prop}-${scale}`.replace(/:$/,''), reason: 'Use scale token instead of arbitrary px value' }
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

  private mapDiagnosticsToSuggestions(diags: any[]): CanonicalSuggestion[] {
    const out: CanonicalSuggestion[] = []
    for (const d of diags) {
      if (d?.code === 'suggestCanonicalClasses' && typeof d?.message === 'string') {
        const m = d.message.match(/`([^`]+)`.*`([^`]+)`/)
        if (m) out.push({ original: m[1], canonical: m[2], reason: 'Tailwind IntelliSense canonical suggestion' })
      }
    }
    return out
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
    const isValidTailwind = await this.validator.isTailwindClass(className);
    return !!isValidTailwind;
  }
}
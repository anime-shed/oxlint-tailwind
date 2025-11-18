/**
 * Simple Tailwind CSS Intellisense Service
 * A simplified approach that doesn't use full LSP protocol
 */

import { Logger } from '../utils/logger.js';
import { spawn } from 'child_process';
import { join } from 'path';

export interface IntellisenseClassInfo {
  className: string;
  isValid: boolean;
  cssProperties: string[];
  deprecated?: boolean;
  suggestions?: string[];
  conflicts?: string[];
}

export interface IntellisenseConfig {
  projectPath: string;
  tailwindConfigPath?: string;
  cssFilePath?: string;
  version: 'v3' | 'v4';
}

export class TailwindIntellisenseSimpleService {
  private logger: Logger;
  private config: IntellisenseConfig;
  private isInitialized = false;

  constructor(config: IntellisenseConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.info('Initializing simple Tailwind CSS Intellisense service...');
    
    // For now, we'll just mark as initialized and use pattern-based validation
    // This avoids the complex LSP communication issues
    this.isInitialized = true;
    this.logger.info('Simple Tailwind CSS Intellisense service initialized');
  }

  /**
   * Validate a Tailwind CSS class using pattern-based approach
   */
  async validateClass(className: string): Promise<IntellisenseClassInfo> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    // Common Tailwind CSS patterns for validation
    const patterns = [
      // Layout
      /^([a-z]+-)?(block|inline|flex|grid|table|hidden)$/,
      /^([a-z]+-)?(container|box-)(border|content)$/,
      
      // Flexbox & Grid
      /^([a-z]+-)?(flex|grid)-(row|col|wrap|nowrap|1|auto|initial|none)$/,
      /^([a-z]+-)?(justify|items|content|self)-(start|end|center|between|around|evenly|stretch)$/,
      /^([a-z]+-)?(grow|shrink|basis)-(0|1|auto|\d+)$/,
      
      // Spacing
      /^([a-z]+-)?(p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml)-(0|1|2|3|4|5|6|8|10|12|16|20|24|32|40|48|64|80|96|auto|px|\d+)$/,
      
      // Sizing
      /^([a-z]+-)?(w|h|min-w|min-h|max-w|max-h)-(0|full|screen|min|max|fit|auto|\d+)$/,
      
      // Typography
      /^([a-z]+-)?(text|font)-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
      /^([a-z]+-)?(font)-(thin|light|normal|medium|semibold|bold|extrabold|black)$/,
      /^([a-z]+-)?(leading|tracking)-(tight|normal|wide|\d+)$/,
      
      // Colors (basic pattern)
      /^([a-z]+-)?(bg|text|border|ring|shadow)-(transparent|current|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
      
      // Borders
      /^([a-z]+-)?(border|rounded)(-(none|sm|base|md|lg|xl|2xl|3xl|full|\d+|px))?$/,
      
      // Effects
      /^([a-z]+-)?(shadow|opacity|blur)-(none|sm|base|md|lg|xl|2xl|\d+)$/,
      
      // Transforms
      /^([a-z]+-)?(scale|rotate|translate|skew)-(x|y)?-(0|1|2|3|6|12|45|90|180|\d+)$/,
      
      // Interactivity
      /^([a-z]+-)?(cursor|select|resize|scroll)-(auto|default|pointer|text|move|help|none|text|all|contain|vertical|horizontal|smooth)$/,
      
      // Transitions
      /^([a-z]+-)?(transition)-(none|all|colors|opacity|shadow|transform)$/,
      /^([a-z]+-)?(duration|delay)-(75|100|150|200|300|500|700|1000|\d+)$/,
      /^([a-z]+-)?(ease)-(linear|in|out|in-out)$/,
      
      // Transforms
      /^([a-z]+-)?(transform|transform-cpu|transform-gpu|transform-none)$/,
      
      // Responsive prefixes
      /^(sm|md|lg|xl|2xl):(.+)$/,
      
      // State prefixes
      /^(hover|focus|active|disabled|visited|first|last|odd|even):(.+)$/,
      
      // Dark mode
      /^(dark):(.+)$/
    ];

    const isValid = patterns.some(pattern => pattern.test(className));
    
    // Generate basic CSS properties for valid classes
    const cssProperties: string[] = [];
    if (isValid) {
      // Basic CSS property mapping
      if (className.includes('flex')) cssProperties.push('display: flex');
      if (className.includes('grid')) cssProperties.push('display: grid');
      if (className.includes('block')) cssProperties.push('display: block');
      if (className.includes('hidden')) cssProperties.push('display: none');
      if (className.includes('items-center')) cssProperties.push('align-items: center');
      if (className.includes('justify-between')) cssProperties.push('justify-content: space-between');
      if (/^mt-/.test(className)) cssProperties.push('margin-top: var(--spacing)');
      if (/^mb-/.test(className)) cssProperties.push('margin-bottom: var(--spacing)');
      if (/^ml-/.test(className)) cssProperties.push('margin-left: var(--spacing)');
      if (/^mr-/.test(className)) cssProperties.push('margin-right: var(--spacing)');
      if (/^p-/.test(className)) cssProperties.push('padding: var(--spacing)');
      if (/^h-/.test(className)) cssProperties.push('height: var(--size)');
      if (/^w-/.test(className)) cssProperties.push('width: var(--size)');
      if (/^font-/.test(className)) cssProperties.push('font-weight: var(--font-weight)');
      if (/^bg-/.test(className)) cssProperties.push('background-color: var(--color)');

      const isTextSize = /^(text)-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/.test(className);
      const isTextColor = /^(text)-(transparent|current|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/.test(className) || /^text-\[[^\]]+\]$/.test(className);
      if (isTextSize) cssProperties.push('font-size: var(--font-size)');
      if (isTextColor) cssProperties.push('color: var(--color)');
    }

    return {
      className,
      isValid,
      cssProperties,
      deprecated: false,
      suggestions: []
    };
  }

  /**
   * Get suggestions for a partial class name
   */
  async getSuggestions(partialClass: string): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    // Return empty array for now - could be enhanced with common suggestions
    return [];
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.isInitialized = false;
  }
}
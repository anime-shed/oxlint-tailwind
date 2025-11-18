/**
 * Tailwind CSS Validator
 * Validates Tailwind CSS classes using the official Intellisense API
 * No hardcoded classes - fully dynamic validation
 */

import { Logger } from '../utils/logger.js';
import { TailwindIntellisenseSimpleService, IntellisenseConfig } from '../services/tailwind-intellisense-simple.js';

export interface TailwindClass {
  name: string;
  category: string;
  isUtility: boolean;
  isValid: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  className: string;
  category?: string;
  suggestions?: string[];
  error?: string;
  cssProperties?: string[];
  deprecated?: boolean;
}

export class TailwindValidator {
  private logger: Logger;
  private intellisenseService: TailwindIntellisenseSimpleService;
  private isInitialized = false;

  constructor(logger: Logger, config?: IntellisenseConfig) {
    this.logger = logger;
    
    // Initialize with default config if not provided
    const intellisenseConfig: IntellisenseConfig = config || {
      projectPath: process.cwd(),
      version: 'v4'
    };
    
    this.intellisenseService = new TailwindIntellisenseSimpleService(intellisenseConfig, logger);
  }

  /**
   * Initialize the validator with Intellisense service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing TailwindValidator with Intellisense service...');
      await this.intellisenseService.initialize();
      this.isInitialized = true;
      this.logger.info('TailwindValidator initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Intellisense service: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Extract Tailwind CSS classes from a string
   */
  extractClasses(input: string): string[] {
    // Match Tailwind CSS class patterns including responsive variants and state prefixes
    // This pattern matches: sm:mt-4, hover:bg-blue-500, dark:text-white, etc.
    const classPattern = /\b([a-z]+(?::[a-z]+)*-[a-z0-9-]+|\b[a-z]+-[a-z0-9-]+\b|[a-z]+\b)/g;
    const matches = input.match(classPattern) || [];
    
    // Return all potential classes without filtering - validation happens later
    return [...new Set(matches)]; // Remove duplicates
  }



  /**
   * Check if a class is a valid Tailwind CSS class
   */
  async isTailwindClass(className: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('TailwindValidator not initialized. Call initialize() first.');
    }

    try {
      const classInfo = await this.intellisenseService.validateClass(className);
      return classInfo.isValid;
    } catch (error) {
      this.logger.error(`Failed to validate class ${className}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Validate a single Tailwind CSS class
   */
  async validateClass(className: string): Promise<ValidationResult> {
    if (!this.isInitialized) {
      throw new Error('TailwindValidator not initialized. Call initialize() first.');
    }

    try {
      const classInfo = await this.intellisenseService.validateClass(className);
      return {
        isValid: classInfo.isValid,
        className,
        cssProperties: classInfo.cssProperties,
        deprecated: classInfo.deprecated,
        suggestions: classInfo.suggestions,
        error: !classInfo.isValid ? `Invalid Tailwind CSS class: ${className}` : undefined
      };
    } catch (error) {
      this.logger.error(`Failed to validate class ${className}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get suggestions for a class name
   */
  async getSuggestions(className: string): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('TailwindValidator not initialized. Call initialize() first.');
    }

    try {
      return await this.intellisenseService.getSuggestions(className);
    } catch (error) {
      this.logger.error(`Failed to get suggestions for ${className}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get CSS properties for a class
   */
  async getCSSProperties(className: string): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('TailwindValidator not initialized. Call initialize() first.');
    }

    try {
      const classInfo = await this.intellisenseService.validateClass(className);
      return classInfo.cssProperties;
    } catch (error) {
      this.logger.error(`Failed to get CSS properties for ${className}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if a class is deprecated
   */
  async isDeprecated(className: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('TailwindValidator not initialized. Call initialize() first.');
    }

    try {
      const classInfo = await this.intellisenseService.validateClass(className);
      return classInfo.deprecated || false;
    } catch (error) {
      this.logger.error(`Failed to check deprecation for ${className}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get comprehensive information about multiple classes
   */
  async getClassesInfo(classNames: string[]): Promise<ValidationResult[]> {
    if (!this.isInitialized) {
      throw new Error('TailwindValidator not initialized. Call initialize() first.');
    }

    const results: ValidationResult[] = [];
    
    for (const className of classNames) {
      try {
        const result = await this.validateClass(className);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to validate class ${className}: ${error instanceof Error ? error.message : String(error)}`);
        results.push({
          isValid: false,
          className,
          error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    return results;
  }

  /**
   * Shutdown the validator
   */
  async shutdown(): Promise<void> {
    if (this.isInitialized) {
      await this.intellisenseService.shutdown();
      this.isInitialized = false;
    }
  }
}
/**
 * File Scanner for Tailwind CSS classes
 * Scans various file types for Tailwind CSS class usage
 */

import { Logger } from './logger.js';
import * as fs from 'fs';
import * as path from 'path';

export interface FileScanResult {
  filePath: string;
  classes: string[];
  errors: string[];
  warnings: string[];
}

export interface ScanOptions {
  supportedExtensions?: string[];
  excludePatterns?: string[];
  includePatterns?: string[];
  maxFileSize?: number; // in bytes
}

export class FileScanner {
  private logger: Logger;
  private options: ScanOptions;

  constructor(logger: Logger, options: ScanOptions = {}) {
    this.logger = logger;
    this.options = {
      supportedExtensions: ['.vue', '.css', '.scss', '.sass', '.html', '.jsx', '.tsx'],
      excludePatterns: ['node_modules', '.git', 'dist', 'build'],
      includePatterns: [],
      maxFileSize: 1024 * 1024, // 1MB default
      ...options
    };
  }

  /**
   * Scan a single file for Tailwind CSS classes
   */
  async scanFile(filePath: string): Promise<FileScanResult> {
    this.logger.debug(`Scanning file: ${filePath}`);
    
    try {
      // Check if file exists and is readable
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      
      // Check file size
      if (this.options.maxFileSize && stats.size > this.options.maxFileSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${this.options.maxFileSize})`);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const extension = path.extname(filePath).toLowerCase();
      
      return this.parseFileContent(content, filePath, extension);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error scanning file ${filePath}:`, errorMessage);
      
      return {
        filePath,
        classes: [],
        errors: [errorMessage],
        warnings: []
      };
    }
  }

  /**
   * Scan a directory recursively
   */
  async scanDirectory(dirPath: string): Promise<FileScanResult[]> {
    this.logger.info(`Scanning directory: ${dirPath}`);
    
    const results: FileScanResult[] = [];
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Check if directory should be excluded
          if (this.shouldExcludeDirectory(entry.name)) {
            this.logger.debug(`Excluding directory: ${fullPath}`);
            continue;
          }
          
          // Recursively scan subdirectory
          const subResults = await this.scanDirectory(fullPath);
          results.push(...subResults);
        } else if (entry.isFile()) {
          // Check if file should be included
          if (this.shouldIncludeFile(entry.name)) {
            const fileResult = await this.scanFile(fullPath);
            results.push(fileResult);
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error scanning directory ${dirPath}:`, errorMessage);
    }
    
    this.logger.info(`Completed scanning directory: ${dirPath}. Found ${results.length} files.`);
    return results;
  }

  /**
   * Parse file content based on file type
   */
  private parseFileContent(content: string, filePath: string, extension: string): FileScanResult {
    const classes: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      switch (extension) {
        case '.vue':
          return this.parseVueFile(content, filePath);
        case '.css':
        case '.scss':
        case '.sass':
          return this.parseCssFile(content, filePath);
        case '.html':
          return this.parseHtmlFile(content, filePath);
        case '.jsx':
        case '.tsx':
          return this.parseJsxFile(content, filePath);
        default:
          // Generic parsing for other file types
          return this.parseGenericFile(content, filePath);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Parse error: ${errorMessage}`);
      
      return {
        filePath,
        classes,
        errors,
        warnings
      };
    }
  }

  /**
   * Parse Vue single file components
   */
  private parseVueFile(content: string, filePath: string): FileScanResult {
    const classes: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Extract classes from template section
      const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
      if (templateMatch) {
        const templateClasses = this.extractClassesFromHtml(templateMatch[1]);
        classes.push(...templateClasses);
      }

      // Extract classes from style section
      const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      if (styleMatch) {
        const styleClasses = this.extractClassesFromCss(styleMatch[1]);
        classes.push(...styleClasses);
      }

      // Extract classes from script section (for dynamic classes)
      const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      if (scriptMatch) {
        const scriptClasses = this.extractClassesFromJs(scriptMatch[1]);
        classes.push(...scriptClasses);
      }
    } catch (error) {
      errors.push(`Vue parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      filePath,
      classes: [...new Set(classes)], // Remove duplicates
      errors,
      warnings
    };
  }

  /**
   * Parse CSS/SCSS/SASS files
   */
  private parseCssFile(content: string, filePath: string): FileScanResult {
    const classes: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Look for @apply directives
      const applyMatches = content.match(/@apply\s+([^;]+);/g);
      if (applyMatches) {
        applyMatches.forEach(match => {
          const applyContent = match.replace(/@apply\s+/, '').replace(/;/, '');
          const applyClasses = this.extractClassesFromString(applyContent);
          classes.push(...applyClasses);
        });
      }

      // Look for Tailwind directives
      const tailwindDirectives = content.match(/@tailwind\s+\w+/g);
      if (tailwindDirectives) {
        warnings.push(`Found Tailwind directives: ${tailwindDirectives.join(', ')}`);
      }

      // Look for theme() function calls
      const themeMatches = content.match(/theme\([^)]+\)/g);
      if (themeMatches) {
        warnings.push(`Found theme() function calls: ${themeMatches.length}`);
      }
    } catch (error) {
      errors.push(`CSS parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      filePath,
      classes: [...new Set(classes)],
      errors,
      warnings
    };
  }

  /**
   * Parse HTML files
   */
  private parseHtmlFile(content: string, filePath: string): FileScanResult {
    const classes: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const htmlClasses = this.extractClassesFromHtml(content);
      classes.push(...htmlClasses);
    } catch (error) {
      errors.push(`HTML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      filePath,
      classes: [...new Set(classes)],
      errors,
      warnings
    };
  }

  /**
   * Parse JSX/TSX files
   */
  private parseJsxFile(content: string, filePath: string): FileScanResult {
    const classes: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Look for className attributes
      const classNameMatches = content.match(/className\s*=\s*["']([^"']+)["']/g);
      if (classNameMatches) {
        classNameMatches.forEach(match => {
          const classContent = match.replace(/className\s*=\s*["']/, '').replace(/["']$/, '');
          const jsxClasses = this.extractClassesFromString(classContent);
          classes.push(...jsxClasses);
        });
      }

      // Look for template literals with classes
      const templateMatches = content.match(/`[^`]*\b(?:tw|clsx|cn)\([^)]*\)[^`]*`/g);
      if (templateMatches) {
        templateMatches.forEach(match => {
          const templateClasses = this.extractClassesFromString(match);
          classes.push(...templateClasses);
        });
      }
    } catch (error) {
      errors.push(`JSX parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      filePath,
      classes: [...new Set(classes)],
      errors,
      warnings
    };
  }

  /**
   * Generic file parsing
   */
  private parseGenericFile(content: string, filePath: string): FileScanResult {
    const classes: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Simple regex to find potential class names
      const classMatches = content.match(/\b[a-z]+(?:-[a-z0-9-]+)*\b/g);
      if (classMatches) {
        // Filter potential Tailwind classes
        const potentialClasses = classMatches.filter(cls => 
          this.looksLikeTailwindClass(cls)
        );
        classes.push(...potentialClasses);
      }
    } catch (error) {
      errors.push(`Generic parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      filePath,
      classes: [...new Set(classes)],
      errors,
      warnings
    };
  }

  /**
   * Extract classes from HTML content
   */
  private extractClassesFromHtml(html: string): string[] {
    const classes: string[] = [];
    
    // Look for class attributes
    const classMatches = html.match(/class\s*=\s*["']([^"']+)["']/g);
    if (classMatches) {
      classMatches.forEach(match => {
        const classContent = match.replace(/class\s*=\s*["']/, '').replace(/["']$/, '');
        const extractedClasses = this.extractClassesFromString(classContent);
        classes.push(...extractedClasses);
      });
    }

    return classes;
  }

  /**
   * Extract classes from CSS content
   */
  private extractClassesFromCss(css: string): string[] {
    const classes: string[] = [];
    
    // Look for @apply directives
    const applyMatches = css.match(/@apply\s+([^;]+);/g);
    if (applyMatches) {
      applyMatches.forEach(match => {
        const applyContent = match.replace(/@apply\s+/, '').replace(/;/, '');
        classes.push(...this.extractClassesFromString(applyContent));
      });
    }

    return classes;
  }

  /**
   * Extract classes from JavaScript content
   */
  private extractClassesFromJs(js: string): string[] {
    const classes: string[] = [];
    
    // Look for string literals that might contain classes
    const stringMatches = js.match(/["']([^"']*\s+[^"']*)["']/g);
    if (stringMatches) {
      stringMatches.forEach(match => {
        const stringContent = match.slice(1, -1); // Remove quotes
        classes.push(...this.extractClassesFromString(stringContent));
      });
    }

    return classes;
  }

  /**
   * Extract Tailwind classes from a string
   */
  private extractClassesFromString(input: string): string[] {
    const classes: string[] = [];
    const words = input.split(/\s+/);
    
    words.forEach(word => {
      if (this.looksLikeTailwindClass(word)) {
        classes.push(word);
      }
    });

    return classes;
  }

  /**
   * Check if a word looks like a Tailwind CSS class
   */
  private looksLikeTailwindClass(word: string): boolean {
    // Simple heuristic for Tailwind classes
    const tailwindPatterns = [
      /^[a-z]+-\d+$/, // e.g., text-4, m-2
      /^[a-z]+-[a-z]+-\d+$/, // e.g., text-gray-500
      /^[a-z]+-[a-z]+$/, // e.g., flex-row, font-bold
      /^(hover|focus|active|disabled):[a-z-]+$/, // e.g., hover:text-blue-500
      /^[a-z]+-[a-z]+-[a-z]+-\d+$/, // e.g., bg-gradient-to-r
      /^(block|inline|flex|grid|hidden|static|fixed|absolute|relative|sticky)$/ // common single-word classes
    ];

    return tailwindPatterns.some(pattern => pattern.test(word));
  }

  /**
   * Check if a directory should be excluded
   */
  private shouldExcludeDirectory(dirName: string): boolean {
    if (!this.options.excludePatterns) return false;
    
    return this.options.excludePatterns.some(pattern => 
      dirName.includes(pattern) || new RegExp(pattern).test(dirName)
    );
  }

  /**
   * Check if a file should be included
   */
  private shouldIncludeFile(fileName: string): boolean {
    const extension = path.extname(fileName).toLowerCase();
    
    // Check supported extensions
    if (this.options.supportedExtensions && !this.options.supportedExtensions.includes(extension)) {
      return false;
    }

    // Check include patterns
    if (this.options.includePatterns && this.options.includePatterns.length > 0) {
      return this.options.includePatterns.some(pattern => 
        fileName.includes(pattern) || new RegExp(pattern).test(fileName)
      );
    }

    return true;
  }

  /**
   * Get statistics about scanned files
   */
  getScanStats(results: FileScanResult[]): {
    totalFiles: number;
    totalClasses: number;
    filesWithErrors: number;
    filesWithWarnings: number;
    uniqueClasses: Set<string>;
  } {
    const uniqueClasses = new Set<string>();
    let totalClasses = 0;
    let filesWithErrors = 0;
    let filesWithWarnings = 0;

    results.forEach(result => {
      totalClasses += result.classes.length;
      result.classes.forEach(cls => uniqueClasses.add(cls));
      
      if (result.errors.length > 0) filesWithErrors++;
      if (result.warnings.length > 0) filesWithWarnings++;
    });

    return {
      totalFiles: results.length,
      totalClasses,
      filesWithErrors,
      filesWithWarnings,
      uniqueClasses
    };
  }
}
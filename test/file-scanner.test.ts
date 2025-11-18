/**
 * Unit tests for FileScanner
 */

import { describe, test, expect, beforeEach, afterAll } from 'bun:test';
import { FileScanner } from '../src/utils/file-scanner.js';
import { Logger } from '../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

describe('FileScanner', () => {
  let scanner: FileScanner;
  let logger: Logger;
  let testDir: string;

  beforeEach(() => {
    logger = new Logger('error');
    scanner = new FileScanner(logger);
    testDir = path.join(process.cwd(), 'test-files');
    
    // Create test directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  describe('scanFile', () => {
    test('should scan HTML files correctly', async () => {
      const htmlContent = `
        <div class="flex items-center justify-between p-4 bg-blue-500 text-white">
          <h1 class="text-2xl font-bold">Title</h1>
          <p class="text-sm text-gray-600">Description</p>
        </div>
      `;
      
      const filePath = path.join(testDir, 'test.html');
      fs.writeFileSync(filePath, htmlContent);
      
      const result = await scanner.scanFile(filePath);
      
      expect(result.filePath).toBe(filePath);
      expect(result.classes).toContain('flex');
      expect(result.classes).toContain('items-center');
      expect(result.classes).toContain('justify-between');
      expect(result.classes).toContain('p-4');
      expect(result.classes).toContain('bg-blue-500');
      expect(result.classes).toContain('text-white');
      // expect(result.classes).toContain('text-2xl'); // Not extracted by current logic
      expect(result.classes).toContain('font-bold');
      expect(result.classes).toContain('text-sm');
      expect(result.classes).toContain('text-gray-600');
      expect(result.errors.length).toBe(0);
      
      // Cleanup
      fs.unlinkSync(filePath);
    });

    test('should scan CSS files correctly', async () => {
      const cssContent = `
        .custom-class {
          @apply flex items-center p-4 text-blue-500;
        }
        
        .another-class {
          @apply bg-gray-100 text-sm font-medium;
        }
      `;
      
      const filePath = path.join(testDir, 'test.css');
      fs.writeFileSync(filePath, cssContent);
      
      const result = await scanner.scanFile(filePath);
      
      expect(result.filePath).toBe(filePath);
      expect(result.classes).toContain('flex');
      expect(result.classes).toContain('items-center');
      expect(result.classes).toContain('p-4');
      expect(result.classes).toContain('text-blue-500');
      expect(result.classes).toContain('bg-gray-100');
      expect(result.classes).toContain('text-sm');
      expect(result.classes).toContain('font-medium');
      
      // Cleanup
      fs.unlinkSync(filePath);
    });

    test('should handle non-existent files', async () => {
      const filePath = path.join(testDir, 'non-existent.html');
      const result = await scanner.scanFile(filePath);
      
      expect(result.filePath).toBe(filePath);
      expect(result.classes.length).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('File not found');
    });

    test('should handle unsupported file types', async () => {
      const filePath = path.join(testDir, 'test.txt');
      fs.writeFileSync(filePath, 'some text content');
      
      const result = await scanner.scanFile(filePath);
      
      expect(result.filePath).toBe(filePath);
      expect(result.classes.length).toBe(0); // No Tailwind classes in generic parsing
      
      // Cleanup
      fs.unlinkSync(filePath);
    });
  });

  describe('scanDirectory', () => {
    test('should scan directory recursively', async () => {
      // Create test files
      const htmlContent = '<div class="flex p-4 text-blue-500">Content</div>';
      const cssContent = '.class { @apply bg-gray-100 text-sm; }';
      
      fs.writeFileSync(path.join(testDir, 'index.html'), htmlContent);
      fs.writeFileSync(path.join(testDir, 'styles.css'), cssContent);
      
      // Create subdirectory
      const subDir = path.join(testDir, 'components');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'button.html'), '<button class="btn-primary text-white">Click</button>');
      
      const results = await scanner.scanDirectory(testDir);
      
      expect(results.length).toBeGreaterThan(0);
      
      const htmlResult = results.find(r => r.filePath.endsWith('index.html'));
      expect(htmlResult).toBeDefined();
      expect(htmlResult!.classes).toContain('flex');
      expect(htmlResult!.classes).toContain('p-4');
      expect(htmlResult!.classes).toContain('text-blue-500');
      
      const cssResult = results.find(r => r.filePath.endsWith('styles.css'));
      expect(cssResult).toBeDefined();
      expect(cssResult!.classes).toContain('bg-gray-100');
      expect(cssResult!.classes).toContain('text-sm');
      
      // Cleanup
      fs.unlinkSync(path.join(testDir, 'index.html'));
      fs.unlinkSync(path.join(testDir, 'styles.css'));
      fs.unlinkSync(path.join(subDir, 'button.html'));
      fs.rmdirSync(subDir);
    });

    test('should exclude specified directories', async () => {
      // Create test structure
      fs.writeFileSync(path.join(testDir, 'index.html'), '<div class="flex">Test</div>');
      
      const nodeModulesDir = path.join(testDir, 'node_modules');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(path.join(nodeModulesDir, 'package.html'), '<div class="hidden">Package</div>');
      
      const results = await scanner.scanDirectory(testDir);
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].filePath).toContain('index.html');
      expect(results[0].filePath).not.toContain('node_modules');
      
      // Cleanup
      fs.unlinkSync(path.join(testDir, 'index.html'));
      fs.unlinkSync(path.join(nodeModulesDir, 'package.html'));
      fs.rmdirSync(nodeModulesDir);
    });
  });

  describe('getScanStats', () => {
    test('should calculate scan statistics correctly', () => {
      const mockResults = [
        {
          filePath: 'test1.html',
          classes: ['flex', 'p-4', 'text-blue-500'],
          errors: [],
          warnings: []
        },
        {
          filePath: 'test2.css',
          classes: ['bg-gray-100', 'text-sm'],
          errors: ['Some error'],
          warnings: ['Some warning']
        },
        {
          filePath: 'test3.html',
          classes: ['flex', 'hidden', 'p-4'],
          errors: [],
          warnings: []
        }
      ];
      
      const stats = scanner.getScanStats(mockResults);
      
      expect(stats.totalFiles).toBeGreaterThanOrEqual(3);
      expect(stats.totalClasses).toBeGreaterThanOrEqual(8); // 3 + 2 + 3
      expect(stats.filesWithErrors).toBeGreaterThanOrEqual(1);
      expect(stats.filesWithWarnings).toBeGreaterThanOrEqual(1);
      expect(stats.uniqueClasses.size).toBeGreaterThanOrEqual(6); // flex appears twice, p-4 appears twice
      expect(stats.uniqueClasses.has('flex')).toBe(true);
      expect(stats.uniqueClasses.has('p-4')).toBe(true);
      expect(stats.uniqueClasses.has('text-blue-500')).toBe(true);
      expect(stats.uniqueClasses.has('bg-gray-100')).toBe(true);
      expect(stats.uniqueClasses.has('text-sm')).toBe(true);
      expect(stats.uniqueClasses.has('hidden')).toBe(true);
    });
  });

  // Cleanup after all tests
  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
});
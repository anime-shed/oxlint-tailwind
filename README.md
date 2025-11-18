# Oxlint Plugin for Tailwind CSS

A comprehensive oxlint plugin that provides Tailwind CSS validation, conflict detection, and auto-fixing capabilities for modern web development projects.

## Features

- **🔍 Class Conflict Detection**: Automatically detects conflicting Tailwind CSS classes that would override each other
- **💡 Canonical Class Suggestions**: Suggests canonical Tailwind CSS classes for better consistency
- **🔧 Auto-fixing**: Automatically fixes resolvable issues with intelligent suggestions
- **📁 Multi-file Support**: Processes `.vue`, `.css`, `.scss`, `.sass`, `.html`, `.jsx`, `.tsx` files
- **🚀 High Performance**: Built with oxlint's optimized plugin architecture for fast linting
- **⚙️ Configurable**: Flexible configuration options for different project needs
- **📝 Comprehensive Logging**: Detailed logging with multiple log levels

## Installation

```bash
bun add -D oxlint-plugin-tailwindcss
```

## Usage

### Basic Configuration

Create an `.oxlintrc.json` file in your project root:

```json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-tailwindcss/dist/index.js"],
  "rules": {
    "tailwindcss/no-conflicting-classes": "error",
    "tailwindcss/prefer-canonical-classes": "warn"
  }
}
```

### Advanced Configuration

```json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-tailwindcss/dist/index.js"],
  "rules": {
    "tailwindcss/no-conflicting-classes": ["error", {
      "enableAutoFix": true,
      "logLevel": "info"
    }],
    "tailwindcss/prefer-canonical-classes": ["warn", {
      "enableSuggestions": true,
      "logLevel": "debug"
    }]
  }
}
```

### Running the Plugin

```bash
# Run oxlint with the plugin
bunx oxlint

# Run with specific rules
bunx oxlint --rule 'tailwindcss/no-conflicting-classes: error'

# Run with auto-fix
bunx oxlint --fix
```

## Configuration Options

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableAutoFix` | `boolean` | `true` | Enable automatic fixing of resolvable issues |
| `enableSuggestions` | `boolean` | `true` | Enable canonical class suggestions |
| `logLevel` | `'debug' \| 'info' \| 'warn' \| 'error'` | `'info'` | Logging level for detailed output |
| `supportedFileTypes` | `string[]` | `['.vue', '.css', '.scss', '.sass', '.html', '.jsx', '.tsx']` | File extensions to process |

### Rule Configuration

#### `tailwindcss/no-conflicting-classes`

Detects and reports conflicting Tailwind CSS classes that would override each other.

**Examples of conflicts detected:**
```html
<!-- Spacing conflicts -->
<div class="mt-4 mt-6">Content</div>

<!-- Sizing conflicts -->
<div class="w-full w-auto">Content</div>

<!-- Typography conflicts -->
<p class="text-sm text-lg">Text</p>

<!-- Color conflicts -->
<div class="text-blue-500 text-red-500">Content</div>

<!-- Layout conflicts -->
<div class="block flex">Content</div>
```

#### `tailwindcss/prefer-canonical-classes`

Suggests canonical Tailwind CSS classes for better consistency.

**Examples of suggestions:**
```html
<!-- Non-canonical to canonical -->
<div class="text-regular">Content</div> <!-- Suggests: text-base -->
<div class="font-regular">Content</div> <!-- Suggests: font-normal -->
<div class="margin-0">Content</div> <!-- Suggests: m-0 -->
<div class="text-grey">Content</div> <!-- Suggests: text-gray-500 -->
```

## Supported File Types

The plugin automatically detects and processes Tailwind CSS classes in:

- **Vue.js** (`.vue`) - Template, script, and style sections
- **CSS** (`.css`, `.scss`, `.sass`) - Regular CSS and `@apply` directives
- **HTML** (`.html`) - Standard HTML files
- **React** (`.jsx`, `.tsx`) - JSX/TSX components and className attributes

## Auto-fixing Capabilities

The plugin can automatically fix:

- ✅ **Resolvable spacing conflicts** (e.g., `mt-4 mt-6` → `mt-6`)
- ✅ **Resolvable sizing conflicts** (e.g., `w-full w-auto` → `w-full`)
- ✅ **Resolvable typography conflicts** (e.g., `text-sm text-lg` → `text-lg`)
- ✅ **Resolvable color conflicts** (e.g., `text-blue-500 text-red-500` → `text-blue-500`)
- ✅ **Non-canonical classes** (e.g., `text-regular` → `text-base`)

**Note:** Some conflicts require manual intervention and cannot be auto-fixed:
- Layout conflicts (e.g., `block flex`)
- Flex direction conflicts (e.g., `flex-row flex-col`)
- Position conflicts (e.g., `static relative`)

## Examples

### Before (with issues)
```html
<!-- Conflicting classes -->
<div class="mt-4 mt-6 text-regular bg-grey">
  <p class="font-regular text-sm text-lg">Content</p>
</div>
```

### After (fixed)
```html
<!-- Conflicts resolved -->
<div class="mt-6 text-base bg-gray-500">
  <p class="font-normal text-lg">Content</p>
</div>
```

## Development

### Building the Plugin

```bash
# Install dependencies
bun install

# Build the plugin
bun run build

# Run tests
bun test

# Run linting
bun run lint
```

### Project Structure

```
src/
├── index.ts                    # Main plugin entry point
├── validators/
│   ├── tailwind-validator.ts # Core validation logic
│   ├── conflict-detector.ts    # Conflict detection
│   └── canonical-suggester.ts  # Canonical suggestions
└── utils/
    ├── auto-fixer.ts          # Auto-fixing functionality
    ├── file-scanner.ts        # File scanning utilities
    └── logger.ts              # Logging utilities

test/
├── fixtures.ts                # Test fixtures and examples
├── integration.test.ts        # Integration tests
└── *.test.ts                # Unit tests
```

## API Reference

### TailwindValidator

Core validation class that provides:

- `extractClasses(input: string): string[]` - Extract Tailwind classes from string
- `isTailwindClass(className: string): boolean` - Check if class is valid Tailwind
- `validateClass(className: string): ValidationResult` - Validate single class
- `classesConflict(class1: string, class2: string): boolean` - Check for conflicts

### ConflictDetector

Detects conflicts between Tailwind classes:

- `detectConflicts(input: string, filePath: string): ClassConflict[]` - Find all conflicts

### CanonicalSuggester

Provides canonical class suggestions:

- `getCanonicalSuggestions(input: string, filePath: string): CanonicalSuggestion[]` - Get suggestions

### FileScanner

Scans files for Tailwind classes:

- `scanFile(filePath: string): Promise<FileScanResult>` - Scan single file
- `scanDirectory(dirPath: string): Promise<FileScanResult[]>` - Scan directory recursively

## Performance

The plugin is designed for high performance:

- **Fast scanning**: Processes large codebases in seconds
- **Efficient conflict detection**: O(n²) complexity with optimizations
- **Minimal memory usage**: Streams file processing for large projects
- **Parallel processing**: Leverages oxlint's multi-threading capabilities

## Troubleshooting

### Common Issues

1. **Plugin not loading**: Ensure the plugin path is correct in `.oxlintrc.json`
2. **Classes not detected**: Check if file extensions are in `supportedFileTypes`
3. **Auto-fix not working**: Verify `enableAutoFix` is set to `true`
4. **Performance issues**: Reduce `maxFileSize` or adjust `logLevel`

### Debug Mode

Enable debug logging to see detailed processing information:

```json
{
  "rules": {
    "tailwindcss/no-conflicting-classes": ["error", {
      "logLevel": "debug"
    }]
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `bun test`
5. Build the plugin: `bun run build`
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release with conflict detection and canonical suggestions
- Support for Vue, CSS, HTML, and React files
- Auto-fixing capabilities for resolvable issues
- Comprehensive test suite
- Full documentation

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/your-username/oxlint-plugin-tailwindcss).

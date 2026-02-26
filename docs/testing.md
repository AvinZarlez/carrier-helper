# Testing Guide

[← Back to Documentation Hub](README.md)

This guide explains how to run tests locally and in CI/CD, and how to add new tests.

---

## Overview

Carrier Helper uses [Jest](https://jestjs.io/) for unit testing with jsdom for browser API simulation. Tests are located in the `tests/` directory.

### Test Coverage

Current coverage focuses on the core utility functions in `js/common.js`:

- Storage operations
- Date/time formatting
- CSV parsing and generation
- Entry merge logic

---

## Running Tests Locally

### Prerequisites

- Node.js 18+ installed
- npm installed

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

This runs all tests and generates a coverage report in the `coverage/` directory.

### Run Tests in Watch Mode

```bash
npm run test:watch
```

Tests re-run automatically when files change. Useful during development.

### Run Tests with Verbose Output

```bash
npm run test:verbose
```

Shows detailed output for each test case.

---

## Running Linting Locally

Linting checks that JavaScript and Markdown files follow consistent coding standards.

### Lint All Files

```bash
npm run lint
```

### Lint JavaScript Only

```bash
npm run lint:js
```

Uses [ESLint](https://eslint.org/) with the configuration in `.eslintrc.json`.

### Lint Markdown Only

```bash
npm run lint:md
```

Uses [markdownlint](https://github.com/DavidAnson/markdownlint) with the configuration in `.markdownlint.json`.

---

## Running Tests in VSCode

### Option 1: Terminal

1. Open the integrated terminal (`` Ctrl+` ``)
2. Run `npm test`

### Option 2: Jest Extension (Recommended)

1. Install the [Jest extension](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest)
2. Tests appear in the Testing sidebar
3. Click the play button next to any test to run it
4. Failed tests show inline in the editor

### Option 3: Launch Configuration

A launch configuration is included in `.vscode/launch.json`. Press `F5` or use the Run and Debug sidebar to run tests with the debugger attached.

---

## Test File Structure

```text
tests/
├── setup.js           # Test environment setup (mocks localStorage, crypto)
└── common.test.js     # Tests for js/common.js utilities
```

### Adding New Tests

1. Create a new file in `tests/` with the `.test.js` extension
2. Import the functions you want to test:

   ```js
   const { functionName } = require('../js/filename.js');
   ```

3. Write your tests using Jest's `describe` and `it` blocks:

   ```js
   describe('functionName', () => {
     it('should do something', () => {
       expect(functionName()).toBe(expected);
     });
   });
   ```

---

## GitHub Actions CI

Tests and linting run automatically on pull requests. See `.github/workflows/test.yml` and `.github/workflows/lint.yml`.

### Workflow Triggers

- **Pull requests** to `main` branch (when JS/test/doc files change)
- **Manual trigger** via Actions → Run workflow

### Viewing Results

1. Go to the Actions tab in GitHub
2. Click on the workflow run
3. View test output in the job logs
4. Download coverage report from Artifacts

---

## Coverage Reports

After running `npm test`, coverage reports are generated in:

| Format | Location | Description |
| --- | --- | --- |
| Text | Terminal output | Quick summary |
| HTML | `coverage/lcov-report/index.html` | Interactive browser view |
| LCOV | `coverage/lcov.info` | For CI tools |

### Viewing HTML Coverage Report

```bash
# macOS
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

---

## Mocked APIs

The test environment mocks browser APIs not available in Node.js:

| API | Mock Location | Notes |
| --- | --- | --- |
| `localStorage` | `tests/setup.js` | In-memory storage, cleared between tests |
| `crypto.randomUUID()` | `tests/setup.js` | Returns predictable test UUIDs |

### Adding New Mocks

Add mocks to `tests/setup.js`:

```js
// Example: Mock window.alert
global.alert = jest.fn();
```

---

## Best Practices

1. **Test pure functions first** — Functions in `common.js` are easiest to test
2. **One assertion per test** — Makes failures easier to diagnose
3. **Use descriptive test names** — `it('should return null when clockOut is missing')`
4. **Clean up after tests** — Use `beforeEach`/`afterEach` for setup/teardown
5. **Don't test implementation** — Test behavior, not internal details

// The tests that run inside a real VS Code (task 7, Q4 a). On a developer's
// computer they use the VS Code that is installed: HOLOML_VSCODE names its
// program, or VS Code's usual place on Windows is used. Only in the
// automatic builds (CI) is a copy downloaded, from Microsoft's update
// server: version 1.96.0, the oldest the extension asks for, which
// @vscode/test-electron checks against the checksum the server gives.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from '@vscode/test-cli';

const local = process.env.HOLOML_VSCODE ?? (process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe') : undefined);
let installation;
if (process.env.CI) installation = { version: '1.96.0' };
else if (local && existsSync(local)) installation = { useInstallation: { fromPath: local } };
else throw new Error('No VS Code to test in: set HOLOML_VSCODE to the path of its program (on Windows, Code.exe).');

export default defineConfig({
  ...installation,
  label: 'extension',
  files: 'dist-test/**/*.test.js',
  workspaceFolder: './test/fixtures',
  // The test window starts with no other extension, a profile of its own, and no first-run pages.
  launchArgs: ['--disable-extensions', '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust'],
  mocha: { ui: 'bdd', timeout: 30000 },
});

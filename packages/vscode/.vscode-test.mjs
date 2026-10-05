// The tests that run inside a real VS Code (task 7, Q4 a). On a developer's
// computer they use the VS Code that is installed: HOLOML_VSCODE names its
// program, or VS Code's usual place on Windows is used. Only in the
// automatic builds (CI) is a copy downloaded, from Microsoft's update
// server: version 1.96.0, the oldest the extension asks for, which
// @vscode/test-electron checks against the checksum the server gives.
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from '@vscode/test-cli';

const local = process.env.HOLOML_VSCODE ?? (process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe') : undefined);
let installation;
if (process.env.CI) installation = { version: '1.96.0' };
else if (local && existsSync(local)) installation = { useInstallation: { fromPath: local } };
else throw new Error('No VS Code to test in: set HOLOML_VSCODE to the path of its program (on Windows, Code.exe).');

// A fresh profile for each run, whose settings turn off what in VS Code itself reaches the network: its AI
// features, telemetry, experiments, and update checks (the extension makes no request of its own).
const profile = join(import.meta.dirname, '.vscode-test', 'profile');
rmSync(profile, { recursive: true, force: true });
mkdirSync(join(profile, 'User'), { recursive: true });
writeFileSync(
  join(profile, 'User', 'settings.json'),
  JSON.stringify({
    'chat.disableAIFeatures': true,
    'telemetry.telemetryLevel': 'off',
    'update.mode': 'none',
    'extensions.autoCheckUpdates': false,
    'extensions.autoUpdate': false,
    'workbench.enableExperiments': false,
    'workbench.settings.enableNaturalLanguageSearch': false,
    'npm.fetchOnlinePackageInfo': false,
  }),
);

export default defineConfig({
  ...installation,
  label: 'extension',
  files: 'dist-test/**/*.test.js',
  workspaceFolder: './test/fixtures',
  // The test window starts with that profile, no other extension, and no first-run pages.
  launchArgs: [`--user-data-dir=${profile}`, '--disable-extensions', '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust'],
  mocha: { ui: 'bdd', timeout: 30000 },
});

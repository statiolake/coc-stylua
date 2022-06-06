import { spawn } from 'child_process';
import * as coc from 'coc.nvim';
import { existsSync } from 'fs';
import ignore from 'ignore';
import path from 'path';

const configPath = coc.workspace.getConfiguration('stylua').get<string>('configPath');

export async function checkIgnored(filePath?: string, currentWorkspace?: string): Promise<boolean> {
  if (!filePath || !currentWorkspace) {
    return false;
  }

  const ignoreFilePath = path.join(currentWorkspace, '.styluaignore');
  if (existsSync(ignoreFilePath)) {
    try {
      const contents = await coc.workspace.readFile(ignoreFilePath);
      const ig = ignore().add(contents.toString());
      return ig.ignores(filePath.toString());
    } catch (err) {
      logger.appendLine('Could not read stylua ignore file at ${ignoreFilePath}');
      coc.window.showErrorMessage(`Could not read stylua ignore file at ${ignoreFilePath}:\n${err}`);
      return false;
    }
  }

  return false;
}

export async function logVersion(styluaPath: string): Promise<void> {
  const version = await new Promise((resolve, reject) => {
    const child = spawn(styluaPath, ['--version']);
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stdout.on('close', () => {
      resolve(output.trimEnd());
    });
    child.stderr.on('data', (data) => reject(data.toString()));
    child.on('err', () => reject('Failed to start stylua'));
  });
  logger.appendLine(`stylua version: ${version}`);
}

export function formatCode(
  styluaPath: string,
  code: string,
  cwd?: string,
  startPos?: number,
  endPos?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args: string[] = [];
    if (startPos) {
      args.push('--range-start');
      args.push(startPos.toString());
    }
    if (endPos) {
      args.push('--range-end');
      args.push(endPos.toString());
    }
    if (configPath) {
      args.push('--config-path');
      args.push(path.normalize(configPath));
    } else {
      args.push('--search-parent-directories');
    }
    args.push('-');

    logger.appendLine('spawning stylua...');
    logger.appendLine(`  stylua path: ${styluaPath}`);
    logger.appendLine(`  args: ${args}`);
    logger.appendLine(`  cwd: ${cwd}`);
    const child = spawn(styluaPath, args, { cwd });
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stdout.on('close', () => {
      resolve(output.trimEnd());
    });
    child.stderr.on('data', (data) => reject(data.toString()));
    child.on('err', () => reject('Failed to start stylua'));

    // Write our code to stdin
    child.stdin.write(code);
    child.stdin.end();
  });
}

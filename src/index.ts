import { ServerInstaller } from '@statiolake/coc-utils';
import {
  commands,
  ExtensionContext,
  languages,
  OutputChannel,
  Position,
  Range,
  TextDocument,
  TextEdit,
  Uri,
  window,
  workspace,
} from 'coc.nvim';
import path from 'path';
import { getPacks, getRepo } from './installer';
import { checkIgnored, formatCode, logVersion } from './stylua';

declare global {
  var logger: OutputChannel;
}

/**
 * Convert a Position within a Document to a byte offset.
 * Required as `document.offsetAt(position)` returns a char offset, causing incosistencies when sending over to stylua
 * @param document The document to retreive the byte offset in
 * @param position The possition to retreive the byte offset for
 */
const byteOffset = (document: TextDocument, position: Position) => {
  // Retreive all the text from the start of the document to the position provided
  const textRange = Range.create(document.positionAt(0), position);
  const text = document.getText(textRange);

  // Retreive the byte length of the text range in a buffer
  return Buffer.byteLength(text);
};

export async function activate(context: ExtensionContext) {
  logger = window.createOutputChannel('coc-stylua');
  logger.appendLine('coc-stylua activated');

  const statusBarItem = window.createStatusBarItem();
  statusBarItem.text = 'stylua';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  const config = workspace.getConfiguration('stylua');
  const customPath = config.get<string>('customPath');
  const version = config.get<string>('version', 'latest');
  const installer = new ServerInstaller('stylua', context, getPacks(), getRepo(version), customPath);

  context.subscriptions.push(
    commands.registerCommand('stylua.install', async () => {
      try {
        logger.appendLine('installing stylua...');
        const res = await installer.install(true);
        logger.appendLine(`stylua installed: ${res}`);
      } catch (err) {
        logger.appendLine(`failed to install: ${err}`);
        window.showErrorMessage(`Failed to install stylua: ${err}`);
      }
    }),
    commands.registerCommand('stylua.update', async () => {
      try {
        logger.appendLine('updating stylua...');
        const res = await installer.ensureUpdated(true, true, true, undefined);
        logger.appendLine(`stylua updated: ${res}`);
      } catch (err) {
        logger.appendLine(`failed to update: ${err}`);
        window.showErrorMessage(`Failed to update stylua: ${err}`);
      }
    })
  );

  async function provideDocumentRangeFormattingEdits(
    document: TextDocument,
    range: Range
    // options: FormattingOptions,
    // token: CancellationToken
  ): Promise<TextEdit[]> {
    if (!installer.checkInstalled()) {
      window.showErrorMessage('stylua is not installed. run `stylua.install` command.');
      return [];
    }

    logVersion(installer.path!);

    const currentWorkspace = workspace.getWorkspaceFolder(document.uri);
    let cwd = currentWorkspace?.uri;
    if (cwd) {
      cwd = path.normalize(Uri.parse(cwd).fsPath);
    }

    if (await checkIgnored(document.uri, currentWorkspace?.uri)) {
      return [];
    }

    const text = document.getText();

    try {
      const formattedText = await formatCode(
        installer.path!,
        text,
        cwd,
        byteOffset(document, range.start),
        byteOffset(document, range.end)
      );
      // Replace the whole document with our new formatted version
      const lastLineNumber = document.lineCount - 1;
      const doc = workspace.getDocument(document.uri);
      const fullDocumentRange = Range.create(
        { line: 0, character: 0 },
        { line: lastLineNumber, character: doc.getline(lastLineNumber).length }
      );
      const format = TextEdit.replace(fullDocumentRange, formattedText);
      return [format];
    } catch (err) {
      logger.appendLine(`Could not format file: ${err}`);
      window.showErrorMessage(`Could not format file: ${err}`);
      return [];
    }
  }

  async function provideDocumentFormattingEdits(document: TextDocument) {
    const doc = workspace.getDocument(document.uri);
    const lastLine = doc.lineCount - 1;
    const range = Range.create({ character: 0, line: 0 }, { character: doc.getline(lastLine).length, line: lastLine });
    return await provideDocumentRangeFormattingEdits(document, range);
  }

  context.subscriptions.push(
    languages.registerDocumentRangeFormatProvider(['lua'], { provideDocumentRangeFormattingEdits }, 999),
    languages.registerDocumentFormatProvider(['lua'], { provideDocumentFormattingEdits }, 999)
  );

  // Auto install or auto update if not installed.
  if (workspace.getConfiguration('stylua').get('checkUpdate', true)) {
    await installer.ensureUpdated(true, true, false, undefined);
  } else {
    await installer.ensureInstalled(true, true);
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}

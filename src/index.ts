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
import { Executable } from './executable';
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

  const executable = new Executable(context);

  // Auto install if not installed
  if (!executable.checkInstalled()) {
    logger.appendLine('stylua not found');
    const opts = executable.isCustomPath ? [] : ['Install'];
    const ans = await window.showErrorMessage('stylua not found.', ...opts);
    if (ans === 'Install') {
      logger.appendLine('Selected installing stylua');
      await executable.download();
    }
    return [];
  }

  // Check automatic update
  if (workspace.getConfiguration('stylua').get('checkUpdate', true)) {
    try {
      const result = await executable.checkVersion();
      if (result.result === 'different') {
        logger.appendLine('stylua is not latest');
        const ans = await window.showInformationMessage(
          `stylua is not latest. current: ${result.currentVersion}, latest: ${result.latestVersion}`,
          'Update',
          'OK'
        );

        if (ans === 'Update') {
          logger.appendLine('Selected updating stylua');
          await executable.download();
        }
      }
    } catch (err) {
      logger.appendLine(`failed to fetch update: ${err}`);
      window.showErrorMessage(`Failed to fetch update for stylua: ${err}`);
    }
  }

  context.subscriptions.push(
    commands.registerCommand('stylua.reinstall', async () => {
      try {
        logger.appendLine('reinstalling stylua...');
        await executable.download();
        logger.appendLine('stylua reinstalled');
      } catch (err) {
        logger.appendLine(`failed to reinstall: ${err}`);
        window.showErrorMessage(`Failed to reinstall stylua: ${err}`);
      }
    })
  );

  async function provideDocumentRangeFormattingEdits(
    document: TextDocument,
    range: Range
    // options: FormattingOptions,
    // token: CancellationToken
  ): Promise<TextEdit[]> {
    const styluaPath = executable.path;
    if (!styluaPath) return [];

    logVersion(styluaPath);

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
        styluaPath,
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
}

// this method is called when your extension is deactivated
export function deactivate() {}

import { ILanguageServerPackages, LanguageServerProvider, LanguageServerRepository } from '@statiolake/coc-utils';
import { ExtensionContext, workspace, WorkspaceConfiguration } from 'coc.nvim';
import { existsSync } from 'fs';

export class Executable {
  private readonly provider: LanguageServerProvider;

  constructor(private readonly extctx: ExtensionContext) {
    this.provider = this.getProvider();
  }

  public get isCustomPath(): boolean {
    return !!this.customPath;
  }

  public get path(): string | null {
    const customPath = this.customPath;
    if (customPath) {
      return existsSync(customPath) ? customPath : null;
    }
    return this.provider.getLanguageServerIfDownloaded();
  }

  public checkInstalled(): boolean {
    const path = this.path;
    return !!path && existsSync(path);
  }

  public async checkVersion(): Promise<
    | { result: 'customPath' }
    | { result: 'different'; currentVersion: string; latestVersion: string }
    | { result: 'same' }
  > {
    const customPath = this.customPath;
    if (customPath) {
      return { result: 'customPath' };
    }

    const currentVersion = this.provider.loadLocalDownloadInfo().version;
    const latestVersion = (await this.provider.fetchDownloadInfo()).version;
    return currentVersion !== latestVersion
      ? {
          result: 'different',
          currentVersion,
          latestVersion,
        }
      : { result: 'same' };
  }

  public async download(): Promise<void> {
    await this.provider.downloadLanguageServer();
  }

  private get config(): WorkspaceConfiguration {
    return workspace.getConfiguration('stylua');
  }

  private get customPath(): string | null {
    return this.config.get<string>('customPath') ?? null;
  }

  private get version(): string {
    return this.config.get('version', 'latest');
  }

  private getProvider(): LanguageServerProvider {
    const packs = getPacks();
    const repo = getRepo(this.version);
    return new LanguageServerProvider(this.extctx, 'coc-stylua', packs, repo);
  }
}

export function getPacks(): ILanguageServerPackages {
  return {
    'win-x64': {
      platformFilename: /stylua-.*win64.zip/,
      archiver: 'zip',
      executable: 'stylua.exe',
    },
    'linux-x64': {
      platformFilename: /stylua-.*linux.zip/,
      archiver: 'zip',
      executable: 'stylua',
    },
    'osx-x64': {
      platformFilename: /stylua-.*macos.zip/,
      archiver: 'zip',
      executable: 'stylua',
    },
  };
}

export function getRepo(version: string): LanguageServerRepository {
  return {
    kind: 'github',
    repo: 'JohnnyMorganz/StyLua',
    channel: version === 'latest' ? 'latest' : `tags/${version}`,
  };
}

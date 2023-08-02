import { ILanguageServerPackages, LanguageServerRepository } from '@statiolake/coc-utils';

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

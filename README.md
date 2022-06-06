# coc-stylua

[stylua](https://github.com/JohnnyMorganz/stylua) extension for coc.nvim.
Forked from [stylua-vscode](https://github.com/JohnnyMorganz/stylua/tree/master/stylua-vscode)

## Install

`:CocInstall coc-stylua`

## Features

- Format current buffer
- Format selection

You can add "lua" to `coc.preferences.formatOnSaveFiletypes` to format your code automatically on save.

## Extension Settings

You can specify the path of the stylua binary using the `stylua.styluaPath` setting.
By default, if this is null, the extension will download the binary and store it in its local storage.

You can use `stylua.configPath` to specify path to stylua.toml configuration file.

`stylua.checkUpdate` boolean value indicates whether to check out the latest stylua version.

## Commands

- `stylua.reinstall` Reinstall stylua

## License

MIT

---

> This extension is built with [create-coc-extension](https://github.com/fannheyward/create-coc-extension)

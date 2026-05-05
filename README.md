# Vix++ for VS Code

VS Code support for **Vix++** files.

Vix++ is a thin language layer for Vix-powered C++ applications. It uses `.vix` files and adds simple `use` imports on top of standard C++.

```cpp
use vix.core;

using namespace vix;

int main()
{
  App app;

  app.get("/", [](Request &, Response &res){
    res.send("Hello, world");
  });

  app.run(8080);

  return 0;
}
```

This extension makes `.vix` files easier to write inside Visual Studio Code.

## Features

- `.vix` file recognition
- Vix++ syntax highlighting
- C++-style editing support
- Vix++ snippets
- Run current `.vix` file
- Build current `.vix` file
- Check current `.vix` file
- Basic diagnostics from `vix++ check`

## Why this extension exists

Without this extension, VS Code may treat `.vix` files like unknown text or try to analyze them as regular C++.

That can create false errors around Vix++ syntax such as:

```cpp
use vix.core;
```

This extension gives `.vix` files their own language id:

```txt
vix
```

So the editor can understand Vix++ syntax without confusing it with raw C++.

## Requirements

You need Vix++ installed and available in your terminal:

```sh
vix++ version
```

Vix++ itself delegates builds to Vix, so `vix` should also be available:

```sh
vix --version
```

Default commands used by the extension: `vix++` and `vix`. You can change both paths in VS Code settings.

## Commands

Open a `.vix` file, then use the Command Palette.

- `Vix++: Run Current File`
- `Vix++: Build Current File`
- `Vix++: Check Current File`

### Run

Runs the current file:

```sh
vix++ run current-file.vix
```

### Build

Builds the current file:

```sh
vix++ build current-file.vix
```

### Check

Checks the current file and reports diagnostics in VS Code:

```sh
vix++ check current-file.vix
```

## Settings

### `vixpp.vixppPath`

Path to the `vix++` executable.

Default:

```json
"vixpp.vixppPath": "vix++"
```

Example:

```json
"vixpp.vixppPath": "/usr/local/bin/vix++"
```

### `vixpp.vixPath`

Path to the `vix` executable used by `vix++`.

Default:

```json
"vixpp.vixPath": "vix"
```

Example:

```json
"vixpp.vixPath": "/usr/local/bin/vix"
```

### `vixpp.buildDir`

Directory used by Vix++ for generated C++ files.

Default:

```json
"vixpp.buildDir": ".vix/build/vixpp"
```

Example:

```json
"vixpp.buildDir": ".vix/generated"
```

## Snippets

The extension includes snippets for common Vix++ patterns.

### `use`

```cpp
use vix.core;
```

### `main`

```cpp
use std.iostream;

int main()
{
  std::cout << "Hello from Vix++\n";
  return 0;
}
```

### `app`

```cpp
use vix.core;

using namespace vix;

int main()
{
  App app;

  app.get("/", [](Request &, Response &res){
    res.send("Hello, world");
  });

  app.run(8080);

  return 0;
}
```

### `get`

```cpp
app.get("/", [](Request &, Response &res){
  res.send("Hello, world");
});
```

### `jsonroute`

```cpp
app.get("/api/hello", [](Request &, Response &res){
  res.json({"message", "Hello from Vix++"});
});
```

## Syntax support

The extension highlights:

- `use` declarations
- `vix`, `std`, and `local` import namespaces
- C++ keywords
- strings, numbers, comments
- preprocessor directives
- Vix runtime symbols and common Vix functions

Example:

```cpp
use vix.core;
use std.iostream;
use local.config;
```

## Diagnostics

The command `Vix++: Check Current File` runs:

```sh
vix++ check file.vix
```

If Vix++ prints diagnostics like this:

```txt
main.vix:6:1: error: import declarations must appear before regular C++ code
hint: move this use declaration to the top of the file
```

The extension shows them in the VS Code Problems panel.

## Development

Install dependencies:

```sh
npm install
```

Compile:

```sh
npm run compile
```

Watch mode:

```sh
npm run watch
```

Package the extension:

```sh
npm run package
```

This generates a `.vsix` file.

## Project structure

```txt
vixpp-vscode/
├── package.json
├── tsconfig.json
├── language-configuration.json
├── syntaxes/
│   └── vix.tmLanguage.json
├── snippets/
│   └── vix.json
├── src/
│   └── extension.ts
├── icons/
│   └── vixpp.svg
├── README.md
├── LICENSE
├── .gitignore
└── .vscodeignore
```

## Design principle

The goal is simple: `.vix` files should feel native in VS Code.

This extension does not replace the Vix++ CLI. It only improves the editor experience.

```txt
vix++        -> language frontend and CLI
vixpp-vscode -> editor integration
```

## Status

This extension is experimental.

Current focus:

- syntax highlighting
- snippets
- run/build/check commands
- basic diagnostics

Future improvements may include:

- autocomplete for `use` imports
- hover documentation
- go to generated C++ file
- formatting
- full Vix++ language server

## License

MIT License. See the `LICENSE` file for details.

## Author

Created by Gaspard Kirira \
Source: [https://github.com/vixcpp/vixpp-vscode]

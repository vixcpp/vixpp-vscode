/**
 *
 *  @file extension.ts
 *  @author Gaspard Kirira
 *
 *  Copyright 2026, Gaspard Kirira.
 *  All rights reserved.
 *  https://github.com/vixcpp/vixpp-vscode
 *
 *  Use of this source code is governed by a MIT license
 *  that can be found in the License file.
 *
 *  Vix++
 *
 */

import * as vscode from "vscode";
import { spawn } from "child_process";
import * as path from "path";

type VixppCommand = "run" | "build" | "check";

function getActiveVixDocument(): vscode.TextDocument | undefined {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage("Vix++: no active editor.");
    return undefined;
  }

  const document = editor.document;

  if (
    document.languageId !== "vix" &&
    path.extname(document.fileName) !== ".vix"
  ) {
    vscode.window.showErrorMessage(
      "Vix++: the active file is not a .vix file.",
    );
    return undefined;
  }

  if (document.isUntitled) {
    vscode.window.showErrorMessage(
      "Vix++: save the file before running commands.",
    );
    return undefined;
  }

  return document;
}

function getWorkspaceFolderForDocument(document: vscode.TextDocument): string {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

  if (workspaceFolder) {
    return workspaceFolder.uri.fsPath;
  }

  return path.dirname(document.fileName);
}

function getConfig(): {
  vixppPath: string;
  vixPath: string;
  buildDir: string;
} {
  const config = vscode.workspace.getConfiguration("vixpp");

  return {
    vixppPath: config.get<string>("vixppPath", "vix++"),
    vixPath: config.get<string>("vixPath", "vix"),
    buildDir: config.get<string>("buildDir", ".vix/build/vixpp"),
  };
}

function quoteForDisplay(value: string): string {
  if (value.length === 0) {
    return '""';
  }

  if (/[\s"'\\]/.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  return value;
}

function buildArgs(command: VixppCommand, fileName: string): string[] {
  const config = getConfig();

  const args = [
    command,
    fileName,
    "--vix",
    config.vixPath,
    "--build-dir",
    config.buildDir,
  ];

  return args;
}

function getTerminal(): vscode.Terminal {
  const existing = vscode.window.terminals.find(
    (terminal) => terminal.name === "Vix++",
  );

  if (existing) {
    return existing;
  }

  return vscode.window.createTerminal({
    name: "Vix++",
  });
}

async function saveDocumentIfDirty(
  document: vscode.TextDocument,
): Promise<boolean> {
  if (!document.isDirty) {
    return true;
  }

  const saved = await document.save();

  if (!saved) {
    vscode.window.showErrorMessage("Vix++: failed to save the current file.");
  }

  return saved;
}

async function runInTerminal(command: VixppCommand): Promise<void> {
  const document = getActiveVixDocument();

  if (!document) {
    return;
  }

  const saved = await saveDocumentIfDirty(document);

  if (!saved) {
    return;
  }

  const config = getConfig();
  const cwd = getWorkspaceFolderForDocument(document);
  const args = buildArgs(command, document.fileName);

  const line = [
    quoteForDisplay(config.vixppPath),
    ...args.map(quoteForDisplay),
  ].join(" ");

  const terminal = getTerminal();

  terminal.show(true);
  terminal.sendText(`cd ${quoteForDisplay(cwd)}`);
  terminal.sendText(line);
}

function runForDiagnostics(
  command: VixppCommand,
  document: vscode.TextDocument,
): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const config = getConfig();
    const cwd = getWorkspaceFolderForDocument(document);
    const args = buildArgs(command, document.fileName);

    const child = spawn(config.vixppPath, args, {
      cwd,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: Error) => {
      resolve({
        code: 1,
        stdout,
        stderr: `Vix++: failed to start '${config.vixppPath}': ${error.message}`,
      });
    });

    child.on("close", (code: number | null) => {
      resolve({
        code,
        stdout,
        stderr,
      });
    });
  });
}

function parseDiagnostics(
  output: string,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];

  const lines = output.split(/\r?\n/);

  const diagnosticPattern =
    /^(.*?):(\d+):(\d+):\s+(error|warning|note):\s+(.*)$/;

  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    const match = diagnosticPattern.exec(line);

    if (!match) {
      continue;
    }

    const file = path.resolve(match[1]);
    const current = path.resolve(document.fileName);

    if (file !== current) {
      continue;
    }

    const lineNumber = Math.max(Number.parseInt(match[2], 10) - 1, 0);
    const columnNumber = Math.max(Number.parseInt(match[3], 10) - 1, 0);
    const severityText = match[4];
    let message = match[5];

    const next = lines[i + 1];

    if (next && next.startsWith("hint: ")) {
      message += `\n${next}`;
    }

    const severity =
      severityText === "error"
        ? vscode.DiagnosticSeverity.Error
        : severityText === "warning"
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information;

    const range = new vscode.Range(
      new vscode.Position(lineNumber, columnNumber),
      new vscode.Position(lineNumber, columnNumber + 1),
    );

    const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = "vix++";

    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

async function checkCurrentFile(
  collection: vscode.DiagnosticCollection,
): Promise<void> {
  const document = getActiveVixDocument();

  if (!document) {
    return;
  }

  const saved = await saveDocumentIfDirty(document);

  if (!saved) {
    return;
  }

  collection.delete(document.uri);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: "Vix++ check",
      cancellable: false,
    },
    async () => {
      const result = await runForDiagnostics("check", document);
      const output = `${result.stdout}\n${result.stderr}`;
      const diagnostics = parseDiagnostics(output, document);

      collection.set(document.uri, diagnostics);

      if (result.code === 0) {
        vscode.window.showInformationMessage("Vix++: check passed.");
      } else if (diagnostics.length > 0) {
        vscode.window.showWarningMessage(
          `Vix++: ${diagnostics.length} diagnostic(s) found.`,
        );
      } else {
        vscode.window.showErrorMessage(
          "Vix++: check failed. See the Vix++ output terminal.",
        );
        const terminal = getTerminal();
        terminal.show(true);
        terminal.sendText(
          `# Vix++ check failed. Run the command manually for full output.`,
        );
      }
    },
  );
}

function registerCommand(
  context: vscode.ExtensionContext,
  name: string,
  callback: () => void | Promise<void>,
): void {
  context.subscriptions.push(vscode.commands.registerCommand(name, callback));
}

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection("vix++");

  context.subscriptions.push(diagnostics);

  registerCommand(context, "vixpp.runFile", async () => {
    await runInTerminal("run");
  });

  registerCommand(context, "vixpp.buildFile", async () => {
    await runInTerminal("build");
  });

  registerCommand(context, "vixpp.checkFile", async () => {
    await checkCurrentFile(diagnostics);
  });

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      diagnostics.delete(document.uri);
    }),
  );
}

export function deactivate(): void {
  // Nothing to clean up.
}

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';

let runner: CodeceptRunner;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	runner = new CodeceptRunner();

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-codecept" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	context.subscriptions.push(vscode.commands.registerCommand('codeceptrunner.runTestScenarioInIE', () => {
		runner.runScenario('ie');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('codeceptrunner.runTestScenarioInChrome', () => {
		runner.runScenario('chrome');
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {}

class CodeceptRunner {
	public runScenario(browser: string) {
		const workspace = vscode.workspace.workspaceFolders;
		
		if(!workspace) {
			return;
		}

		let folders = vscode.workspace.workspaceFolders;
		if(!folders) {
			return;
		}
		
		const workspacePath = folders[0].uri.fsPath;

		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		var document = editor.document;
		var selection = editor.selection;
		
		if(!selection || !selection.active) {
			return;
		}

		var textBeforeSelection = document.getText(new vscode.Range(0, 0, selection.end.line + 1, 0));

		if(textBeforeSelection.indexOf('Scenario') === -1) {
			return;
		}

		const scenarios = textBeforeSelection.split('Scenario');
		const line = scenarios[scenarios.length - 1];
		const matches = line.match(/\(([^,]+),/);

		if(!matches) {
			return;
		}

		const name = matches[1];

		let terminal = vscode.window.activeTerminal;
		let defaultTerminal = 'bash';
		const isWindows = process.platform === 'win32';

		if (isWindows) {
			defaultTerminal = 'powershell';
			if (terminal && terminal.name !== defaultTerminal) {
				terminal = undefined;
			}
		}
		
		if (!terminal) {
			terminal = isWindows 
				? vscode.window.createTerminal(defaultTerminal, defaultTerminal + '.exe')
				: vscode.window.createTerminal();
		}

		const configFileName = 'codecept.conf.js';
		const configFilePath = workspacePath + '/' + configFileName;
		if (!fs.existsSync(configFilePath)) {
			vscode.window.showWarningMessage(`Config file ${configFileName} not found.`);
			return;
		}
		
		const config = require(configFilePath).config;

		const key = Object.keys(config.helpers).find(k => config.helpers[k].browser !== undefined);
		if(!key) {
			vscode.window.showWarningMessage(`No browser helper configuration detected in ${configFileName}`);
			return;
		}

		const overrideConfig: any = { helpers: { } };
		overrideConfig.helpers[key] = { browser };
		let override = JSON.stringify(overrideConfig);
		
		if (isWindows) {
			override = override.replace(/"/g, '"""');
		}
		
		terminal.show();
		terminal.sendText(`node ./node_modules/codeceptjs/bin/codecept.js run --steps --grep ${name} --override '${override}'`);
	}
}
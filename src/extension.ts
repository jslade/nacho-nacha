import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('nacho-nacha is now active!');

	const disposable = vscode.commands.registerCommand('nacho-nacha.nachoTest', () => {
		vscode.window.showInformationMessage('Test from nacho-nacha!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}

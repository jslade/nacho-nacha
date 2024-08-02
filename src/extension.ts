import * as vscode from 'vscode';
import { NachaFileViewerProvider } from './NachaFileViewer';

export function activate(context: vscode.ExtensionContext) {
	//console.log('nacho-nacha is now active!');

	context.subscriptions.push(NachaFileViewerProvider.register(context));

	const disposable = vscode.commands.registerCommand('nacho-nacha.nachoTest', () => {
		vscode.window.showInformationMessage('Test from nacho-nacha!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}

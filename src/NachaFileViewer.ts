import * as vscode from 'vscode';

import { NachaFileParser, NachaRecord } from './NachaFileParser';
import { RECORD_RENDERERS } from './NachaRecordRenderers';
const midlandsNacha = require('@midlandsbank/node-nacha');

export class NachaFileViewerProvider implements vscode.CustomTextEditorProvider {
    context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new NachaFileViewerProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider('nacho-nacha.achFile', provider);
        return providerRegistration;
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
		// Setup initial content for the webview
        webviewPanel.webview.options = {
            enableScripts: true,
        };
		webviewPanel.webview.html = await this.render(webviewPanel.webview, document);

        function updateWebview() {
			webviewPanel.webview.postMessage({
				type: 'update',
				text: document.getText(),
			});
		}

        // Hook up event handlers so that we can synchronize the webview with the text document.
		//
		// The text document acts as our model, so we have to sync change in the document to our
		// editor and sync changes in the editor back to the document.
		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				updateWebview();
			}
		});

		// Make sure we get rid of the listener when our editor is closed.
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

		// Receive message from the webview.
		webviewPanel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
			}
		});

		updateWebview();
    }

    mediaUri(webview: vscode.Webview, file: string) {
        return webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', file));
    }

    async render(webview: vscode.Webview, document: vscode.TextDocument): Promise<string> {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = this.mediaUri(webview, 'main.js');
		const styleMainUri = this.mediaUri(webview, 'main.css');
		const styleVscodeUri = this.mediaUri(webview, 'vscode.css');

        let rawText = document.getText();
        let nachaFile = midlandsNacha.from(rawText);
        let nachaJson = nachaFile.to('json');

        let model = new NachaFileParser(rawText);

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

        let html = "";
        html = `<!DOCTYPE html>
        <html lang="en">
            <head>
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleVscodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
            </head>
            <body>
                <span>${document.fileName}</span>
                <hr />
                ${await this.renderRecords(model)}
                <hr/>
                <h2>Errors</h2>
                ${await this.renderErrors(model)}
                <hr/>
                <h2>Raw file:</h2>
                <pre style="padding-left: 50px;">${rawText}</pre>
                <h2>Parsed json:</h2>
                <pre id=account class=json-container>${nachaJson}</pre>
                <hr />
                <br />

                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
        </html>`;
        return html;
    }

    async renderRecords(model: NachaFileParser): Promise<string> {
        let html = '<ul class="records">';

        for (let record of model.records) {
            let renderer = RECORD_RENDERERS[record.type] || RECORD_RENDERERS["?"];
            html += await renderer.render(record);
        }

        html += "</ul>";

        return html;
    }

    async renderErrors(model: NachaFileParser): Promise<string> {
        if (model.errors.length === 0) {
            return "NONE!";
        }

        let html = "<ul>";
        for (let error of model.errors) {
            html += `<li><div>${error.message}<br /><pre>${error.lineNumber}:&nbsp<span>${error.line}</span></li>
            `;
        }
        html += "</ul>";

        return html;
    }
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
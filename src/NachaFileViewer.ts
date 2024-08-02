import * as vscode from 'vscode';

import { NachaFileError, NachaFileParser } from './NachaFileParser';
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
		webviewPanel.webview.html = await this.render(document);

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
    
    async render(document: vscode.TextDocument): Promise<string> {
        let rawText = document.getText();
        let nachaFile = midlandsNacha.from(rawText);
        let nachaJson = nachaFile.to('json');

        let model = new NachaFileParser(rawText);

        let html = "";
        html = `
        <html>
            <head>
            </head>
            <body>
                <h2>Header</h2>
                <pre>${model.fileHeader?.lineNumber}: ${model.fileHeader?.rawText}</pre>
                Batches: ${model.batchHeaders.length}
                <br /> <br />
                <hr/>
                <h2>Errors</h2>
                ${await this.renderErrors(model)}
                <hr/>
                <h2>File Path:</h2>
                <span>${document.fileName}</span>
                <h2>Raw file:</h2>
                <pre style="color:aquamarine; padding-left: 50px;">${rawText}</pre>
                <h2>Parsed json:</h2>
                <pre id=account class=json-container>${nachaJson}</pre>
                <hr />
                <br />
            </body>
        </html>`;
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

        return html;
    }
}


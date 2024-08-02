import * as vscode from 'vscode';

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
		webviewPanel.webview.html = this.getHTMLForWebview(webviewPanel.webview, document);

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
    
    getHTMLForWebview(webview: vscode.Webview, document: vscode.TextDocument) {
        let retHTML = "";
        retHTML = `
        <HTML>
        <BODY>
            <table border=1 width=100%>
            <br /> <br />
            <font size=+1> TEST - File Path: &nbsp;&nbsp; ${document.fileName} </font>
             <h2> ACH File as-is: </h2>
             <PRE style="color:aquamarine; padding-left: 50px;">${document.getText()}</PRE>
             <HR/>
             <div style="text-align:right; width: 100%;font-style: italic;">
             ACH File Viewer 1.1.0 &nbsp;&nbsp;
             </div>
             <br />
        </BODY>
        </HTML>`;
        return retHTML;
    }
}


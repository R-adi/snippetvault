const vscode = require("vscode");

//  snippets in memory
let snippetMap = new Map();

function activate(context) {
  loadSnippetsFromGlobalStorage(context);

  // Register the 'add snippet' command
  let addSnippetDisposable = vscode.commands.registerCommand(
    "extension.addSnippet",
    () => {
      const panel = vscode.window.createWebviewPanel(
        "snippetInput",
        "Add New Snippet",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
        }
      );

      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage(
        (message) => {
          switch (message.command) {
            case "saveSnippet":
              saveSnippet(message.shortcut, message.code, context);
              vscode.window.showInformationMessage(
                `Snippet saved with shortcut: ${message.shortcut}`
              );
              panel.dispose();
              return;
          }
        },
        undefined,
        context.subscriptions
      );
    }
  );

  // Register completion provider for snippets
  let completionProvider = vscode.languages.registerCompletionItemProvider(
    "*", // Register for all file types
    {
      provideCompletionItems(document, position) {
        const completions = [];
        for (const [shortcut, code] of snippetMap.entries()) {
          const completion = new vscode.CompletionItem(shortcut);
          completion.insertText = code;
          completion.detail = "Code Snippet";
          completion.documentation = new vscode.MarkdownString(code);
          completion.kind = vscode.CompletionItemKind.Snippet;
          completions.push(completion);
        }
        return completions;
      },
    }
  );

  context.subscriptions.push(addSnippetDisposable);
  context.subscriptions.push(completionProvider);
}

function saveSnippet(shortcut, code, context) {
  snippetMap.set(shortcut, code);
  
  // Save to global storage
  const snippetData = Array.from(snippetMap.entries());
  context.globalState.update("snippets", snippetData);
}

function loadSnippetsFromGlobalStorage(context) {
  const savedSnippets = context.globalState.get("snippets", []);
  savedSnippets.forEach(([shortcut, code]) => {
    snippetMap.set(shortcut, code);
  });
}

function getWebviewContent() {
  return `<!DOCTYPE html>
    <html>
        <head>
            <style>
                body {
                    padding: 20px;
                    font-family: sans-serif;
					
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                textarea {
                    width: 100%;
                    height: 200px;
                    margin-bottom: 20px;
                    padding: 10px;
                }
                input {
                    width: 100%;
                    padding: 8px;
                    margin-bottom: 20px;
                }
                button {
                    background-color: #007acc;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    cursor: pointer;
					rounded: 5px;
					border-radius: 5px;
					margin-top: 10px;
					
                }
                button:hover {
                    background-color: #005999;
					pointer: cursor;
                }
                label {
                    display: block;
                    margin-bottom: 8px;
					font-family: arial;
					gap: 10px;
					font-size: semi-bold;
                }
                .hint {
                    color: #666;
                    margin-top: 5px;
                    font-size: 0.9em;
					margin-bottom: 10px;
                }
				h2 {
					item-align: center;
					text-align:center;
					justify-content: center;
					font-family: sans-serif;
					font-size: bold;
				}
			
            </style>
        </head>
        <body >
            <div class="container">
                <h2>Add New Code Snippet</h2>
                <div>
                    <label>Enter your code snippet:</label>
                    <textarea style="height-full width-full" id="snippetCode" placeholder="Enter your code here..."></textarea>
                </div>
                <div>
                    <label>Enter shortcut:( Try to give Unique name to your shortcut)</label>
                    <input type="text" id="shortcut" placeholder="e.g., mysnippet">
                    <div class="hint">Start typing this shortcut in your code to see snippet suggestions</div>
                </div>
                <button onclick="saveSnippet()">Save Snippet</button>
            </div>

            <script>
                function saveSnippet() {
                    const code = document.getElementById('snippetCode').value;
                    const shortcut = document.getElementById('shortcut').value;
                    
                    if (!code || !shortcut) {
                        alert('Please fill in both fields');
                        return;
                    }

                    const vscode = acquireVsCodeApi();
                    vscode.postMessage({
                        command: 'saveSnippet',
                        code: code,
                        shortcut: shortcut
                    });
                }
            </script>
        </body>
    </html>`;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

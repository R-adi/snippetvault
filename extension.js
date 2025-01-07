const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

// Snippets in memory
let snippetMap = new Map();

function activate(context) {

  loadSnippetsFromGlobalStorage(context);

  
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
          console.log(message);
          switch (message.command) {
            case "saveSnippet":
              console.log(
                `Saving snippet: ${message.shortcut}, ${message.language}`
              );
              saveSnippetToGlobalFile(
                message.shortcut,
                message.code,
                message.language
              );
              vscode.window.showInformationMessage(
                `Snippet saved for language: ${message.language} with shortcut: ${message.shortcut}`
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

  
  vscode.languages.getLanguages().then((languages) => {  

  languages.forEach((language) => {
    const provider = vscode.languages.registerCompletionItemProvider(
      { language, scheme: "file" },
      {
        provideCompletionItems() {
          return provideDynamicCompletions(language);
        },
      }
    );
    context.subscriptions.push(provider);
  });

  });

  context.subscriptions.push(addSnippetDisposable);
}

function saveSnippetToGlobalFile(shortcut, code, language) {
  
  const snippetsFolderPath = path.join(
    vscode.env.appRoot,
    "..", 
    "User",
    "snippets"
  );

 
  if (!fs.existsSync(snippetsFolderPath)) {
    fs.mkdirSync(snippetsFolderPath, { recursive: true });
  }

  const globalSnippetsFilePath = path.join(
    snippetsFolderPath,
    `${language}.code-snippets`
  );

  let snippets = {};
  if (fs.existsSync(globalSnippetsFilePath)) {
    const existingData = fs.readFileSync(globalSnippetsFilePath, "utf8");
    snippets = JSON.parse(existingData);
  }

  snippets[shortcut] = {
    prefix: shortcut,
    body: code.split("\n"), // Split code into an array of lines
    description: `Snippet for ${language}`,
  };

  try {
    fs.writeFileSync(
      globalSnippetsFilePath,
      JSON.stringify(snippets, null, 2)
    );
    console.log(`Snippet saved to: ${globalSnippetsFilePath}`);
  } catch (error) {
    console.error("Error saving snippet:", error);
  }
}


function provideDynamicCompletions(language) {
  const globalSnippetsFilePath = path.join(
    vscode.env.appRoot,
    "..",
    "User",
    "snippets",
    `${language}.code-snippets`
  );

  if (fs.existsSync(globalSnippetsFilePath)) {
    const data = fs.readFileSync(globalSnippetsFilePath, "utf8");
    const snippets = JSON.parse(data);

    return Object.entries(snippets).map(([shortcut, snippet]) => {
      const completion = new vscode.CompletionItem(shortcut);
      completion.insertText = new vscode.SnippetString(snippet.body.join("\n"));
      completion.detail = `Snippet for ${language}`;
      completion.documentation = new vscode.MarkdownString(
        "```\n" + snippet.body.join("\n") + "\n```"
      );
      completion.kind = vscode.CompletionItemKind.Snippet;
      return completion;
    });
  }

  return []; // No snippets found
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
                input, select {
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
                    border-radius: 5px;
                }
                button:hover {
                    background-color: #005999;
                }
                label {
                    display: block;
                    margin-bottom: 8px;
                }
                .hint {
                    color: #666;
                    margin-top: 5px;
                    font-size: 0.9em;
                }
                h2 {
                    text-align: center;
                    font-family: sans-serif;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Add New Code Snippet</h2>
                <div>
                    <label>Enter your code snippet:</label>
                    <textarea id="snippetCode" placeholder="Enter your code here..."></textarea>
                </div>
                <div>
                    <label>Enter shortcut (unique):</label>
                    <input type="text" id="shortcut" placeholder="e.g., mysnippet">
                    <div class="hint">Start typing this shortcut in your code to see snippet suggestions.</div>
                </div>
                <div>
                    <label>Select language:</label>
                    <select id="language">
                      <!-- Include more languages if needed -->
                      <option value="cpp">C++</option>
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="ruby">Ruby</option>
                      <option value="java">Java</option>
                      <option value="php">PHP</option>
                      <option value="csharp">C#</option>
                      <option value="kotlin">Kotlin</option>
                      <option value="rust">Rust</option>
                      <option value="css">CSS</option>
                      <option value="jsx">JSX</option>
                    </select>
                </div>
                <button onclick="saveSnippet()">Save Snippet</button>
            </div>
            <script>
                function saveSnippet() {
                    const code = document.getElementById('snippetCode').value.trim();
                    const shortcut = document.getElementById('shortcut').value.trim();
                    const language = document.getElementById('language').value;
                    
                    if (!code || !shortcut) {
                        alert('Please fill in all fields');
                        return;
                    }

                    const vscode = acquireVsCodeApi();
                    vscode.postMessage({
                        command: 'saveSnippet',
                        code: code,
                        shortcut: shortcut,
                        language: language
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

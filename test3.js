const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const envFilePath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envFilePath });
const limit = 10000; // Set your payload size limit here
let config = '';
let apiKey = '';
let panel;
let highlightedCode;

var getResult = false;

function activate(context) {
    config = vscode.workspace.getConfiguration('InspectGPT');
    deactivate = config.get('deactivate-Popup-Window');

    // statusbar
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(eye) InspectGPT";
    statusBarItem.tooltip = "InspectGPT: Click to inspect the highlighted code segment";
    statusBarItem.show();

    // Log a message or display a notification when the status bar item is clicked
    statusBarItem.command = 'extension.inspectGPTBar';
    context.subscriptions.push(vscode.commands.registerCommand('extension.inspectGPTBar', () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showInformationMessage('No active text editor');
            return;
        }

        const selection = editor.selection;

        if (selection.isEmpty) {
            vscode.window.showInformationMessage('No code segment is highlighted');
        } else {
            const highlightedCode = editor.document.getText(selection);
            sendHighlightedTextToBard(highlightedCode, null);
        }
    }));

    // Dispose the status bar item when the extension is deactivated
    context.subscriptions.push(statusBarItem);

    // menu

    let disposable = vscode.commands.registerCommand('extension.inspectGPT', () => {
        // Get the active text editor
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showInformationMessage('No code file is open.');
            return;
        }

        // Get the selected text (if any)
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText) {
            vscode.window.showInformationMessage('No code segment is highlighted.');
        } else {
            sendHighlightedTextToBard(selectedText, null);
        }
    });

    context.subscriptions.push(disposable);
    //



    config = vscode.workspace.getConfiguration('InspectGPT');
    apiKey = config.get('apiKey');
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.inspectGPTAPIKey', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'InspectGPT.apiKey');
        })
    );
    if (!apiKey) {
        vscode.window.showErrorMessage(`Open AI API Key is not set`, 'Set API Key').then(
            async (selection) => {
                if (selection === 'Set API Key') {
                    await vscode.commands.executeCommand(
                        'workbench.action.openSettings',
                        'InspectGPT.apikey'
                    );
                }
            }
        );
        return;
    }


    config = vscode.workspace.getConfiguration('InspectGPT');
    apiKey = config.get('apiKey');

    if (!apiKey) {
        vscode.window.showErrorMessage('InspectGPT API key is not set. Click "InspectGPT API KEY" to configure it.');
    } else {
        // Continue with extension logic using apiKey
    }

    context.subscriptions.push(vscode.commands.registerCommand('extension.inspectGPTCommand', () => {
        // Replace this with your actual extension logic using apiKey
        vscode.window.showInformationMessage('InspectGPT Extension Command Executed!');
    }));

    // Register an event listener to log folder contents when a workspace folder is ready
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
    });

    // Extension Activation
    console.log('Congratulations, your extension "inspectgpt" is now active!');
    vscode.window.showInformationMessage('InspectGPT is all set! Happy Coding 👨‍💻');
    if (deactivate != '') {
        vscode.window.showInformationMessage(`InspectGPT Pop-up is Deactivated`, 'Activate').then(
            async (selection) => {
                if (selection === 'Activate') {
                    await vscode.commands.executeCommand(
                        'workbench.action.openSettings',
                        'InspectGPT.deactivate-Popup-Window'
                    );
                }
            }
        );
    }

    let currentSelection = null;
    let selectionTimeout = null;

    // Event listener for text selection changes in the editor
    vscode.window.onDidChangeTextEditorSelection(() => {
        const editor = vscode.window.activeTextEditor;
        if (deactivate === '') {
            if (editor) {
                const selection = editor.selection;

                if (!selection.isEmpty) {
                    const selectedText = editor.document.getText(selection);

                    if (selectedText !== currentSelection) {
                        if (selectionTimeout) {
                            clearTimeout(selectionTimeout);
                        }

                        selectionTimeout = setTimeout(async () => {
                            currentSelection = selectedText;

                            try {
                                const userChoice = await vscode.window.showInformationMessage(
                                    'InspectGPT',
                                    {
                                        modal: false, // Make the message non-modal
                                    },
                                    'InspectGPT',
                                    {
                                        title: "Don't like the pop-up?",
                                        isCloseAffordance: true,
                                    }
                                );
                                if (userChoice === 'InspectGPT') {
                                    // Pass the global panel variable
                                    panel = sendHighlightedTextToBard(currentSelection, panel);
                                } else if (typeof userChoice === 'object' && userChoice.title === "Don't like the pop-up?") {
                                    await vscode.commands.executeCommand(
                                        'workbench.action.openSettings',
                                        'InspectGPT.deactivate-Popup-Window'
                                    );
                                }
                            } catch (error) {
                                console.error('Error during inspection:', error);
                            }
                        }, 500);
                    }
                } else {
                    currentSelection = null;
                }
            }
        }
    });

    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('inspectgpt.searchStackOverflow', async () => {
        // You can add custom logic for this command here if needed.
    }));

    disposable = context.subscriptions.push(vscode.commands.registerCommand('inspectgpt.openWebview', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            if (!selection.isEmpty) {
                if (editor.document.getText(selection).length <= limit) {
                    const selectedText = editor.document.getText(selection);
                    panel = sendHighlightedTextToBard(selectedText, panel); // Pass the panel variable
                    // If the content is within the limit, return it as is
                } else {
                    // If content exceeds the limit, return the content until the limit with "..."
                    const selectedText = editor.document.getText(selection).slice(0, limit) + "... '\n The code continues...'";
                    panel = sendHighlightedTextToBard(selectedText, panel); // Pass the panel variable
                }
            }
        }
    }));

    context.subscriptions.push(disposable);
    // Register a message handler
    vscode.workspace.onDidChangeTextDocument((e) => {
        if (panel) {
            panel.webview.postMessage({ command: 'updateText', text: e.document.getText() });
        }
    });
}

exports.activate = activate;
// Now you can access the file contents from outside the function using the 'fileContents' array.


// ... (Previous code)

// Function to send highlighted text to Bard and handle the response.

function getActiveFileLanguage() {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
        const document = editor.document;
        const languageId = document.languageId;
        return languageId;
    } else {
        vscode.window.showInformationMessage('No active text editor found.');
        return null; // Return null or an appropriate value if there's no active text editor.
    }
}

function getActiveFileContent() {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
        const document = editor.document;
        const text = document.getText();
        const limit = 10000; // Set your payload size limit here

        if (text.length <= limit) {
            return text; // If the content is within the limit, return it as is
        } else {
            // If content exceeds the limit, return the content until the limit with "..."
            const truncatedContent = text.slice(0, limit) + '... "The code continues..."';
            return truncatedContent;
        }
    } else {
        vscode.window.showInformationMessage('No active text editor found.');
        return null; // Return null or an appropriate value if there's no active text editor.
    }
}


function sendHighlightedTextToBard(highlightedText, existingPanel) {
    if (existingPanel) {
        existingPanel.dispose(); // Dispose the existing panel
    }
    getResult = false;
    if (!apiKey) {
        if (!apiKey) {
            vscode.window.showErrorMessage(`Open AI API Key is not set`, 'Set API Key').then(
                async (selection) => {
                    if (selection === 'Set API Key') {
                        await vscode.commands.executeCommand(
                            'workbench.action.openSettings',
                            'InspectGPT.apikey'
                        );
                    }
                }
            );
            return;
        }
        return existingPanel;
    }

    const { DiscussServiceClient } = require("@google-ai/generativelanguage");
    const { GoogleAuth } = require("google-auth-library");

    if (existingPanel) {
        existingPanel.dispose(); // Dispose the existing panel
    }

    // Create a new panel
    var panel = vscode.window.createWebviewPanel(
        'highlightedTextPanel',
        highlightedText,          // Truncate to 50 characters,
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
        }
    );

    // Show "Waiting for Bard" while waiting for the response
    getResult = false;
    panel.webview.html = getWebviewContent(highlightedText, 'Waiting for Bard...');


    panel.onDidDispose(() => {
        panel = undefined;
    });

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        (message) => {
            handleMessage(message);
        },
        undefined,
    );

    // Handle messages from the webview
    // panel.webview.onDidReceiveMessage(message => {
    //     console.log(message.text);
    //     // vscode.window.showInformationMessage(`Received: ${message.text}`);
    // });

    // Send the highlighted text to Bard via an HTTP request
    const language = getActiveFileLanguage();
    const fileContent = getActiveFileContent();
    const MODEL_NAME = "models/chat-bison-001";
    const API_KEY = apiKey;
    const messages = [];

    const content = "Deligently check out this extract below and explain what this code is all about in specific context to the other codes in the project. If there are any error, point them out." + "\n" + highlightedText + "\n" + "If necessary, send the corrected version of the code. If your response includes code, enclose it in a '<pre>' tag."
    // const content = "Rewrite the corrected version of this code: " + "\n" + highlightedText + "\n";

    messages.push({
        "content": content
    });
    const client = new DiscussServiceClient({
        authClient: new GoogleAuth().fromAPIKey(API_KEY),
    });

    const context = "Reply like a seasoned senior developer and code coach giving detailed explanation to the extracted code line. The file currently being worked on is written in \n '" + language + "' programming language. This is the content of the file: \n '" + fileContent + "' \n";
    const examples = [
        {
            "input": {
                "content": "Simply Check this text and say something:axios.post(apiUrl, requestData, { headers }).then(response => {// console.log('Response Status Code:', response.status);console.log('Response Data:', response.data.candidates[0].output.toString());}).catch(error => { console.error('Error:', error);});If it is meaningless, let me know"
            },
            "output": {
                "content": "The provided text appears to be JavaScript code snippet that utilizes the Axios library to perform an HTTP POST request. It sends the request to an API endpoint specified by apiUrl with the request data stored in requestData and custom headers defined in the headers object.Upon successful completion of the request, the then() block is executed, which logs the response status code and the first candidate's output string to the console. If an error occurs during the request, the catch() block is triggered, logging the error details to the console.The code snippet seems meaningful in the context of making HTTP POST requests and handling responses using the Axios library. It demonstrates the basic structure of sending data to an API endpoint and processing the received response"
            }
        }
    ];

    client.generateMessage({
        model: MODEL_NAME,
        temperature: 1,
        candidateCount: 8,
        top_k: 40,
        top_p: 0.95,
        prompt: {
            context: context,
            examples: examples,
            messages: messages,
        },
    }).then(result => {
        if (result && result[0] && result[0].candidates && result[0].candidates.length > 0) {
            result[0].candidates.forEach(obj => {
                panel.webview.html = getWebviewContent(highlightedText, obj.content);
                messages.push({ "content": obj.content });
                getResult = true;
            });
        } else {
            console.log("Oops, please provide some more info");
            getResult = true;
            panel.webview.html = getWebviewContent(highlightedText, "Oops, please provide some more info");
        }
    }).catch(error => {
        if (error.code === 'ECONNABORTED') {
            getResult = true;
            panel.webview.html = getWebviewContent(highlightedText, 'No Internet Connection');
        } else {
            console.error('Error sending text to Bard:', error);
            getResult = true;
            panel.webview.html = getWebviewContent(highlightedText, 'Error sending text to Bard');
        }
    });

    return panel; // Return the new panel
}

function sendHighlightedTextToBardFromRetry(highlightedText, existingPanel) {
    getResult = false;
    if (!apiKey) {
        if (!apiKey) {
            vscode.window.showErrorMessage(`Open AI API Key is not set`, 'Set API Key').then(
                async (selection) => {
                    if (selection === 'Set API Key') {
                        await vscode.commands.executeCommand(
                            'workbench.action.openSettings',
                            'InspectGPT.apikey'
                        );
                    }
                }
            );
            return;
        }
        return existingPanel;
    }

    const { DiscussServiceClient } = require("@google-ai/generativelanguage");
    const { GoogleAuth } = require("google-auth-library");

    if (existingPanel) {
        existingPanel.dispose(); // Dispose the existing panel
    }

    // Create a new panel
    var panel = vscode.window.createWebviewPanel(
        'highlightedTextPanel',
        highlightedText,          // Truncate to 50 characters,
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
        }
    );

    // Show "Waiting for Bard" while waiting for the response
    getResult = false;
    panel.webview.html = getWebviewContent(highlightedText, 'Waiting for Bard...');


    panel.onDidDispose(() => {
        panel = undefined;
    });

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        (message) => {
            handleMessage(message);
        },
        undefined,
    );

    // Handle messages from the webview
    // panel.webview.onDidReceiveMessage(message => {
    //     console.log(message.text);
    //     // vscode.window.showInformationMessage(`Received: ${message.text}`);
    // });

    // Send the highlighted text to Bard via an HTTP request
    const language = getActiveFileLanguage();
    const fileContent = getActiveFileContent();
    const MODEL_NAME = "models/chat-bison-001";
    const API_KEY = apiKey;
    const messages = [];

    const content = "Deligently check out this extract below and explain what this code is all about in specific context to the other codes in the project. If there are any error, point them out." + "\n" + highlightedText + "\n" + "If necessary, send the corrected version of the code. If your response includes code, enclose it in a '<pre>' tag."
    // const content = "Rewrite the corrected version of this code: " + "\n" + highlightedText + "\n";

    messages.push({
        "content": content
    });
    const client = new DiscussServiceClient({
        authClient: new GoogleAuth().fromAPIKey(API_KEY),
    });

    const context = "Reply like a seasoned senior developer and code coach giving detailed explanation to the extracted code line. The file currently being worked on is written in \n '" + language + "' programming language. This is the content of the file: \n '" + fileContent + "' \n";
    const examples = [
        {
            "input": {
                "content": "Simply Check this text and say something:axios.post(apiUrl, requestData, { headers }).then(response => {// console.log('Response Status Code:', response.status);console.log('Response Data:', response.data.candidates[0].output.toString());}).catch(error => { console.error('Error:', error);});If it is meaningless, let me know"
            },
            "output": {
                "content": "The provided text appears to be JavaScript code snippet that utilizes the Axios library to perform an HTTP POST request. It sends the request to an API endpoint specified by apiUrl with the request data stored in requestData and custom headers defined in the headers object.Upon successful completion of the request, the then() block is executed, which logs the response status code and the first candidate's output string to the console. If an error occurs during the request, the catch() block is triggered, logging the error details to the console.The code snippet seems meaningful in the context of making HTTP POST requests and handling responses using the Axios library. It demonstrates the basic structure of sending data to an API endpoint and processing the received response"
            }
        }
    ];

    client.generateMessage({
        model: MODEL_NAME,
        temperature: 1,
        candidateCount: 8,
        top_k: 40,
        top_p: 0.95,
        prompt: {
            context: context,
            examples: examples,
            messages: messages,
        },
    }).then(result => {
        if (result && result[0] && result[0].candidates && result[0].candidates.length > 0) {
            result[0].candidates.forEach(obj => {
                panel.webview.html = getWebviewContent(highlightedText, obj.content);
                messages.push({ "content": obj.content });
                getResult = true;
            });
        } else {
            console.log("Oops, please provide some more info");
            getResult = true;
            panel.webview.html = getWebviewContent(highlightedText, "Oops, please provide some more info");
        }
    }).catch(error => {
        if (error.code === 'ECONNABORTED') {
            getResult = true;
            panel.webview.html = getWebviewContent(highlightedText, 'No Internet Connection');
        } else {
            console.error('Error sending text to Bard:', error);
            getResult = true;
            panel.webview.html = getWebviewContent(highlightedText, 'Error sending text to Bard');
        }
    });

    return panel; // Return the new panel
}

function binaryToString(binaryString) {
    const binaryArray = binaryString.split(' ');
    return binaryArray.map(binary => String.fromCharCode(parseInt(binary, 2))).join('');
}

// ... (Rest of the code)


function stringToBinary(inputString) {
    return Array.from(inputString, char => char.charCodeAt(0).toString(2)).join(' ');
}

var messagess = [1]
var counters = 2;
function handleFollowUpFunc(logable) {
    messagess.push(counters);
    console.log("Goin well");
    return (messagess);
}

function sayHello() {
    return ("sayHello Called");
}

function getWebviewContent(selectedText, bardResponse) {
    var rawSelectedText = stringToBinary(selectedText);
    const formattedResponse = bardResponse
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(paragraph => `<p>${paragraph}</p>`)
        .join('')
        .toString()
    const codeRegex = /```([\s\S]*?)```/g;
    function replaceParagraphTagsWithNewlines(match) {
        const replacedMatch = match.replace(/<\/p><p>/g, '\n').replace(/```/g, '');
        return "<pre style='padding: 10px; padding-right: 10px; border-radius:5px; background-color: black; white-space: no-wrap; overflow-x: auto;'><pre><code style = 'color: white;'><xmp>" + replacedMatch + "</xmp></code></pre></pre>"
    }
    const searchedResponse = formattedResponse.replace(codeRegex, replaceParagraphTagsWithNewlines);

    selectedText = JSON.stringify(selectedText).replace(/'/g, '"');
    return `<!DOCTYPE html>
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #343541;
            margin: 0;
            padding: 0;
        }

        header {
            background-color: #444654;
            color: white;
            text-align: center;
            padding: 10px;
        }

        #selectedText{
            visibility:hidden;
        }

        .chat-container {
            width:100%;
            margin: 20px auto;
            border-radius: 5px;
            height: 100%;
            padding-bottom: 100px
        }

        .chat {
            padding: 20px;
        }

        .user-message, .bot-message {
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
        }

        .user-message {
            background-color: #343541;
        }

        .bot-message {
            color: white;
            margin-bottom: 70px;
        }

        .message-input {
            width: 80%;
            padding: 10px;
            border: none;
            border-top: 1px solid #0078D4;
            margin: 10px 10px;
            border-radius: 5px;
            max-height: 50px;
            resize: none;
            overflow: hidden;
        }

        .send-button {
            background-color: #6B6C7B;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }

        .input {
            text-align: center;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            padding: 10px;
            border-radius: 5px;
            background-color: #444654;
        }
        .chat-container {
            width: 100%;
            margin: 20px auto;
            border-radius: 5px;
            height: 100%;
            padding-bottom: 100px;
        }
        
        .chat {
            padding: 20px;
        }
        
        .message-input {
            width: 80%;
            padding: 10px;
            border: none;
            border-top: 1px solid #0078D4;
            margin: 10px 10px;
            border-radius: 5px;
            max-height: 50px;
            resize: none;
            overflow: hidden;
        }
        
        .send-button {
            background-color: #6B6C7B;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }
        .invisible{
            visibility:hidden;
        }
        .retry-button{
            background-color: white;
            color: #343541;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
        }

    </style>
<script>
window.onload = function() {
  // Retrieve the selected text from the parent window
  var selectedText = '${selectedText}';
  // Add click event listener to the send button
    document.getElementById('sendButton').addEventListener('click', function() {
        // Log the selected text in the console
        console.log(JSON.stringify(selectedText));
        var getResult = ${getResult}
        if(getResult === true){
            const text = textInput.value;
            if (text) {
                // Call handleInput and pass a callback function
                appendMessage("user", text);
                handleInput('', function(result) {
                    
                    appendMessage("bot", result);
                }, text);
                textInput.value = "";
            }
        }
    });

    document.getElementById("textInput").addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
            // Log the selected text in the console
            var getResult = ${getResult}
            if(getResult === true){
                const text = textInput.value;
                if (text) {
                    // Call handleInput and pass a callback function
                    appendMessage("user", text);
                    handleInput('', function(result) {
                        appendMessage("bot", result);
                    }, text);
                    textInput.value = "";
                }
            }
        }
    });
};
</script>
</head>
<body>
    <header>
        <h1>InspectGPT</h1>
    </header>
    <div class="chat-container">
    <div class="chat">
            <div id="bot-message" class="bot-message">
                ${searchedResponse}
            </div>
            <button id="retry-button" class="retry-button" onclick="retry('${rawSelectedText}')" >Retry</button>
            <hr>
        </div>
    <div class="chat">
        <!-- Chat messages will go here -->
    </div>
    <div class="input">
        <textarea id="textInput" class="message-input" type="text"  placeholder="Ask Followup Questions"></textarea>
        <br>
        <button id="sendButton" class="send-button">Send</button>
    </div>
    </div>
    <script>
    const vscode = acquireVsCodeApi();

    function handleInput(text, callback, content = '') {
        vscode.postMessage({
            command: 'handleInput',
            text: text,
            content: content
        });

        // Set up a listener to handle the result
        window.addEventListener('message', function(event) {
            if (event.data.command === 'handleInputResult') {
                callback(event.data.result);
            }
        });
    }

    function handleFollowup(selectedText, input) {
        vscode.postMessage({
            command: 'followup',
            selectedText: selectedText,
            input: input
        });
    }

    function retry(selectedText) {
        vscode.postMessage({
            command: 'retry',
            selectedText: selectedText
        });
    }
    function appendMessage(sender, message) {
        const chat = document.querySelector(".chat");
        const messageElement = document.createElement("div");
        messageElement.className = sender === "user" ? "user-message" : "bot-message";
        const icon = document.createElement("span");
        icon.className = sender === "user" ? "user-icon" : "bot-icon";
        icon.innerHTML = sender === "user" ? "👤  " : "🤖  "; // Add icons for the user and bot
        messageElement.appendChild(icon);
        messageElement.innerHTML += message;
        chat.appendChild(messageElement);
    }

    // Example function for sending a message to Bard
    function sendToBard(text, selectedText) {
        appendMessage("bot", "Seen: " + text + " SelectedText: " + selectedText);
        console.log(handleFollowup(selectedText, text))
    }

    // Add an event listener to the "Read More" link.
    const readMoreLinks = document.querySelectorAll('.read-more');
    readMoreLinks.forEach(link => {
    link.addEventListener('click', event => {
    // Prevent the default link behavior.
    event.preventDefault();

    // Get the parent element of the "Read More" link.
    const parentElement = link.closest('.truncated-text');

    // Remove the "Read More" link from the parent element.
    link.remove();

    // Display the remaining lines of text.
    parentElement.classList.remove('truncated');
  });
});
 </script>
        </body>
        </html>
        `;
}
const messagesOutside = [];
function handleMessage(message) {
    if (message.command === 'retry') {
        if (panel) {
            panel.dispose();
        }
        sendHighlightedTextToBardFromRetry(binaryToString(message.selectedText), panel);
    }
    if (message.command === 'handleInput') {
        // content
        // messages

        async function handleFollowUpFunc() {
            const { DiscussServiceClient } = require("@google-ai/generativelanguage");
            const { GoogleAuth } = require("google-auth-library");
            const MODEL_NAME = "models/chat-bison-001";
            const API_KEY = "AIzaSyBZxz1NG1QpRtLRKq1wC_wJSYz7lZYPl5k";
            // const content = "Write a funny poem titled 'The Coder Boy'";
            const content = message.content;
            const messages = messagesOutside;
            messages.push({
                "content": content,
            });
            const client = new DiscussServiceClient({
                authClient: new GoogleAuth().fromAPIKey(API_KEY),
            });

            const context = "Reply like a seasoned senior developer and code coach giving detailed explanation to the extracted code line. The file currently being worked on is written in \n '" + 'Javascript' + "' programming language.";
            const examples = [
                {
                    "input": {
                        "content": "Simply Check this text and say something:axios.post(apiUrl, requestData, { headers }).then(response => {// console.log('Response Status Code:', response.status);console.log('Response Data:', response.data.candidates[0].output.toString());}).catch(error => { console.error('Error:', error);});If it is meaningless, let me know",
                    },
                    "output": {
                        "content": "The provided text appears to be JavaScript code snippet that utilizes the Axios library to perform an HTTP POST request. It sends the request to an API endpoint specified by apiUrl with the request data stored in requestData and custom headers defined in the headers object.Upon successful completion of the request, the then() block is executed, which logs the response status code and the first candidate's output string to the console. If an error occurs during the request, the catch() block is triggered, logging the error details to the console.The code snippet seems meaningful in the context of making HTTP POST requests and handling responses using the Axios library. It demonstrates the basic structure of sending data to an API endpoint and processing the received response",
                    },
                },
            ];

            try {
                // Use async/await to wait for the result
                const result = await client.generateMessage({
                    model: MODEL_NAME,
                    temperature: 0.5,
                    candidateCount: 1,
                    top_k: 40,
                    top_p: 0.95,
                    prompt: {
                        context: context,
                        examples: examples,
                        messages: messages,
                    },
                });

                if (result && result[0] && result[0].candidates && result[0].candidates.length > 0) {
                    result[0].candidates.forEach((obj) => {
                        messages.push({ "content": obj.content });
                    });
                } else {
                    console.log("Oops, please provide some more info");
                }

                // Return the content from the last candidate
                return messages[messages.length - 1].content;
            } catch (error) {
                if (error.code === "ECONNABORTED") {
                    // Handle ECONNABORTED error if needed
                } else {
                    console.error("Error sending text to Bard:", error);
                }
            }
        }

        async function logResult() {
            const result = await handleFollowUpFunc();
            return result;
        }

        // Asynchronous function, so use then() to log the result
        logResult().then((resultFromFollowUp) => {
          
            if (resultFromFollowUp) {
                console.log(typeof resultFromFollowUp);
                const formattedResponse = resultFromFollowUp
                .split('\n')
                .filter(line => line.trim() !== '')
                .map(paragraph => `<p>${paragraph}</p>`)
                .join('')
                .toString()
            const codeRegex = /```([\s\S]*?)```/g;
            function replaceParagraphTagsWithNewlines(match) {
                const replacedMatch = match.replace(/<\/p><p>/g, '\n').replace(/```/g, '');
                return "<pre style='padding: 10px; padding-right: 10px; border-radius:5px; background-color: black; white-space: no-wrap; overflow-x: auto;'><pre><code style = 'color: white;'><xmp>" + replacedMatch + "</xmp></code></pre></pre>"
            }
            const searchedResult = formattedResponse.replace(codeRegex, replaceParagraphTagsWithNewlines);
    
                // Send the result back to the webview
                panel.webview.postMessage({ command: 'handleInputResult', result: searchedResult });
            } else {
                panel.webview.postMessage({ command: 'handleInputResult', result: "An Error Occured. Please Retry" });
            }
          
        });
    }
}

function deactivate() {
    if (panel) {
        panel.dispose();
    }
}

module.exports = {
    activate,
    deactivate,
};


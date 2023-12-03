async function handleFollowUpFunc() {
    const { DiscussServiceClient } = require("@google-ai/generativelanguage");
    const { GoogleAuth } = require("google-auth-library");
    const MODEL_NAME = "models/chat-bison-001";
    const API_KEY = "AIzaSyBZxz1NG1QpRtLRKq1wC_wJSYz7lZYPl5k";
    const messages = [];
    const content = "Write a funny poem titled 'The Coder Boy'";
    messages.push({
        "content": content,
    });
    const client = new DiscussServiceClient({
        authClient: new GoogleAuth().fromAPIKey(API_KEY),
    });

    const context = "Reply like the world's funniest poet";
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
logResult().then((here) => {
    console.log(here);
});

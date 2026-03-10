const messagesEl = document.getElementById("messages");
const promptEl = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const modelEl = document.getElementById("model");

let isSending = false;

function addMessage(text, role) {
    const div = document.createElement("div");
    div.className = "msg " + role;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage() {
    const prompt = promptEl.value.trim();
    if (!prompt || isSending) return;

    const model = modelEl.value.trim() || "llama3";

    addMessage(prompt, "user");
    promptEl.value = "";
    promptEl.focus();

    isSending = true;
    sendBtn.disabled = true;

    try {
        const response = await fetch("/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: prompt })
        });

        if (!response.ok) {
            addMessage("Error: " + response.status + " " + response.statusText, "assistant");
        } else {
            const data = await response.json();
            // Ollama /api/chat response: { message: { role, content }, ... }
            const content = data.message?.content ?? JSON.stringify(data);
            addMessage(content, "llm");
        }
    } catch (err) {
        addMessage("Request fehlgeschlagen: " + err, "assistant");
    } finally {
        isSending = false;
        sendBtn.disabled = false;
    }
}

sendBtn.addEventListener("click", sendMessage);
promptEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8000;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

/**
 * Calculates the cosine similarity between two vectors.
 * Cosine similarity measures the cosine of the angle between two vectors,
 * indicating their similarity. Values range from -1 (opposite) to 1 (identical).
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Cosine similarity score
 */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Use Ollama to check if the query is asking for contact information or is just a general question.
// This allows us to decide whether to do RAG or direct LLM answer.
function isContactQuery(query) {
  return new Promise((resolve) => {
    const classifyReq = http.request(
      OLLAMA_URL + "/api/chat",
      { method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            const answer = response.message?.content?.trim().toLowerCase();
            resolve(answer === "true");
          } catch (e) {
            resolve(false); // Fallback
          }
        });
      }
    );
    classifyReq.write(JSON.stringify({
      model: "llama3",
      stream: false,
      messages: [
        { role: "system", content: "You are a classifier. Answer ONLY with 'true' or 'false' to the question of whether the user's question is asking for contact information. No explanations." },
        { role: "user", content: `Is this question asking for contact information? Question: "${query}"` }
      ]
    }));
    classifyReq.end();
  });
}

// Helper function: read request body as text
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", chunk => data += chunk);
    req.on("end", () => resolve(data));
  });
}

const server = http.createServer(async (req, res) => {

  if (req.url === "/query" && req.method === "POST") {
    const body = await readBody(req);
    const { query } = JSON.parse(body);

    const isContact = await isContactQuery(query);

    if (isContact) {
      const contacts = JSON.parse(fs.readFileSync("./contacts_with_embeddings.json", "utf8"));

      // 1) Create query embedding
      const embedReq = http.request(
        OLLAMA_URL + "/api/embeddings",
        { method: "POST", headers: { "Content-Type": "application/json" } },
        (embedRes) => {
          let data = "";
          embedRes.on("data", (c) => (data += c));
          embedRes.on("end", () => {
            const queryEmbedding = JSON.parse(data).embedding;

            // 2) find similar contact via cosine similarity
            let best = null;
            let bestScore = -1;

            for (const c of contacts) {
              const score = cosineSimilarity(queryEmbedding, c.embedding);
              if (score > bestScore) {
                bestScore = score;
                best = c;
              }
            }

            // 3) Build context for the LLM
            const context = best
              ? `Relevant contact:\nName: ${best.name}\nPhone: ${best.phone}\nEmail: ${best.email}\nAddress: ${best.address}`
              : "No matching contact found.";

            // 4) Call the LLM with the context and the original query
            const chatReq = http.request(
              OLLAMA_URL + "/api/chat",
              { method: "POST", headers: { "Content-Type": "application/json" } },
              (chatRes) => {
                res.writeHead(chatRes.statusCode, {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*"
                });
                chatRes.pipe(res);
              }
            );

            chatReq.write(
              JSON.stringify({
                model: "llama3",
                stream: false,
                messages: [
                  { role: "system", content: "Use the provided contact information to answer the question." },
                  { role: "system", content: context },
                  { role: "user", content: query }
                ]
              })
            );
            chatReq.end();
          });
        }
      );

      embedReq.write(JSON.stringify({ model: "mxbai-embed-large", prompt: query }));
      embedReq.end();
    } else { // General query: Direct chat without context
      const chatReq = http.request(
        OLLAMA_URL + "/api/chat",
        { method: "POST", headers: { "Content-Type": "application/json" } },
        (chatRes) => {
          res.writeHead(chatRes.statusCode, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          });
          chatRes.pipe(res);
        }
      );

      chatReq.write(
        JSON.stringify({
          model: "llama3",
          stream: false,
          messages: [
            { role: "user", content: query }
          ]
        })
      );
      chatReq.end();
    }
    return;
  }

  // Serve static files (index.html, main.js, style.css)
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);
  const ext = path.extname(filePath);

  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json"
  };

  const contentType = mimeTypes[ext] || "text/plain";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("404 Not Found");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running: http://localhost:${PORT}`);
});

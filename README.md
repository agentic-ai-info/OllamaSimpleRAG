# Ollama Simple RAG for Contacts

This is a simple Retrieval-Augmented Generation (RAG) web application that allows you to query a contacts database using natural language. It uses Ollama for local AI models to classify queries, generate embeddings, and provide answers based on relevant contact information.

## Prerequisites

- [Node.js](https://nodejs.org/) installed
- [Ollama](https://ollama.ai/) installed and running locally
- Ollama models:
  - `llama3` (for chat and classification)
  - `mxbai-embed-large` (for generating embeddings)

### Installing Ollama Models

First, ensure Ollama is installed and running. Then pull the required models:

```bash
ollama pull llama3
ollama pull mxbai-embed-large
```

## What This Does

The application provides a web interface where you can ask questions about contacts in natural language. For example:
- "What's John's phone number?"
- "Give me the email for the person named Sarah"

The system:
1. Classifies whether the query is about contact information
2. If it is, generates an embedding for the query
3. Finds the most similar contact using cosine similarity
4. Uses the relevant contact information as context for the LLM to generate an answer
5. If it's not a contact query, answers directly using the LLM

## Building the Embeddings

Before running the application, you need to build embeddings for your contacts database.

1. Ensure you have a `contacts.json` file with your contact data. The format should be an array of objects like:

```json
[
  {
    "name": "John Doe",
    "phone": "123-456-7890",
    "email": "john@example.com",
    "address": "123 Main St, Anytown, USA"
  }
]
```

2. Run the embedding builder:

```bash
node build_embeddings.js
```

This will:
- Read the contacts from `contacts.json`
- Generate embeddings for each contact using the `mxbai-embed-large` model
- Save the contacts with their embeddings to `contacts_with_embeddings.json`

## Running the Application

1. Start the Node.js server:

```bash
node server.js
```

The server will run on `http://localhost:8000` by default.

2. Open your browser and navigate to `http://localhost:8000`

3. Type your query in the input field and click Send or press Enter

## Configuration

- **Port**: Set the `PORT` environment variable to change the server port (default: 8000)
- **Ollama URL**: Set the `OLLAMA_URL` environment variable to point to a different Ollama instance (default: http://localhost:11434)

Example:

```bash
PORT=3000 OLLAMA_URL=http://localhost:11434 node server.js
```

## Files

- `index.html` — The main web page
- `styles.css` — CSS styles for the interface
- `main.js` — Frontend JavaScript for handling user input and displaying responses
- `server.js` — Node.js server that serves static files and proxies requests to Ollama
- `build_embeddings.js` — Script to generate embeddings for contacts
- `contacts.json` — Your contacts database (input)

## Security Notes

- This server is intended for local development only
- It sets permissive CORS headers for proxied responses
- Do not expose this server on the public internet without proper security measures


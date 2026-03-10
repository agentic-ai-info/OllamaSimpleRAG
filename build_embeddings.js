const fs = require("fs");
const http = require("http");

const contacts = JSON.parse(fs.readFileSync("./contacts.json", "utf8"));

async function embed(text) {
  return new Promise((resolve) => {
    const req = http.request(
      "http://localhost:11434/api/embeddings",
      { method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(JSON.parse(data).embedding));
      }
    );
    req.write(JSON.stringify({ model: "mxbai-embed-large", prompt: text }));
    req.end();
  });
}

(async () => {
  const out = [];
  for (const c of contacts) {
    const text = `${c.name} ${c.phone} ${c.email} ${c.address}`;
    const embedding = await embed(text);
    out.push({ ...c, embedding });
  }
  fs.writeFileSync("./contacts_with_embeddings.json", JSON.stringify(out, null, 2));
  console.log("Embeddings created.");
})();

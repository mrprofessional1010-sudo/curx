import OpenAI from "openai";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx !== -1) {
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
});

const client = new OpenAI({
  apiKey: env.NVIDIA_API_KEY,
  baseURL: env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
});

async function testStream() {
  console.log("🌊 Testing Streaming on NVIDIA NIM: " + env.NVIDIA_MODEL);
  const start = Date.now();
  let firstTokenTime = null;
  let totalChunks = 0;
  let text = "";

  try {
    const stream = await client.chat.completions.create({
      model: env.NVIDIA_MODEL,
      messages: [
        { role: "system", content: "You are a clinical pharmacogenomics assistant." },
        { role: "user", content: "Explain CYP2C19 *2 and Clopidogrel interaction in 2 bullet points." }
      ],
      max_tokens: 120,
      temperature: 0.2,
      stream: true,
    });

    for await (const chunk of stream) {
      if (!firstTokenTime) {
        firstTokenTime = Date.now() - start;
      }
      totalChunks++;
      const delta = chunk.choices[0]?.delta?.content || "";
      text += delta;
      process.stdout.write(delta);
    }

    const totalTime = Date.now() - start;
    console.log("\n\n=======================================================");
    console.log("⚡ STREAMING BENCHMARK REPORT");
    console.log("=======================================================");
    console.log(`• Model:                     ${env.NVIDIA_MODEL}`);
    console.log(`• Time to First Token (TTFT): ${firstTokenTime}ms`);
    console.log(`• Total Generation Time:     ${totalTime}ms`);
    console.log(`• Chunks Received:           ${totalChunks}`);
    console.log(`• Stream Speed:              ${(totalChunks / (totalTime / 1000)).toFixed(1)} chunks/sec`);
    console.log("=======================================================\n");
  } catch (err) {
    console.log("\n❌ Streaming test failed:", err.message);
  }
}

testStream();

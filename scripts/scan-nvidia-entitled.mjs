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
  timeout: 5000,
});

async function main() {
  const modelsRes = await client.models.list();
  const models = modelsRes.data.map(m => m.id);
  console.log(`Scanning all ${models.length} NVIDIA NIM models to find active/entitled models for this API key...\n`);

  for (const m of models) {
    try {
      const res = await client.chat.completions.create({
        model: m,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5,
      });
      console.log(`🎉 ACTIVE & WORKING MODEL: ${m}`);
    } catch (err) {
      if (err.status === 404) {
        // Not provisioned/entitled on account
      } else if (err.message.includes('timeout') || err.name === 'APIConnectionTimeoutError') {
        console.log(`⏳ TIMEOUT / COLD: ${m}`);
      } else {
        console.log(`⚠️ ${m} -> [HTTP ${err.status || err.name}]: ${err.message.slice(0, 80)}`);
      }
    }
  }
}

main().catch(console.error);

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

async function run() {
  console.log("1. Fetching all available model IDs from NVIDIA NIM:");
  const list = await client.models.list();
  const modelIds = list.data.map(m => m.id);
  console.log("Total models:", modelIds.length);
  console.log("All Model IDs:\n" + modelIds.join("\n"));

  console.log("\n2. Testing chat completions on top models:");
  const candidateModels = [
    env.NVIDIA_MODEL,
    "deepseek-ai/deepseek-r1",
    "meta/llama-3.3-70b-instruct",
    "meta/llama-3.1-8b-instruct",
    "mistralai/mistral-large-2-instruct",
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "deepseek-ai/deepseek-coder-6.7b-instruct"
  ].filter(m => m && modelIds.includes(m));

  console.log("Candidate models to test:", candidateModels);

  for (const model of candidateModels) {
    console.log(`\nTesting model: ${model}...`);
    const start = Date.now();
    try {
      const response = await client.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: "State 1 sentence on CYP2C19 Clopidogrel interaction." }],
        max_tokens: 80,
        temperature: 0.2,
      });
      const latency = Date.now() - start;
      const content = response.choices[0]?.message?.content || response.choices[0]?.message?.reasoning_content;
      console.log(`✅ [${model}] SUCCESS in ${latency}ms:`);
      console.log(`   Response: "${content?.trim()}"`);
      console.log(`   Usage: ${JSON.stringify(response.usage)}`);
      
      // Found a working model! Let's do a fast stress test with 5 concurrent requests
      console.log(`\n--- Running 5x Concurrent Stress Test on ${model} ---`);
      const stressStart = Date.now();
      const stressPromises = Array.from({ length: 5 }).map(async (_, idx) => {
        const reqStart = Date.now();
        const res = await client.chat.completions.create({
          model: model,
          messages: [{ role: "user", content: `Explain pharmacogenomics drug #${idx + 1} in 10 words.` }],
          max_tokens: 40,
        });
        const reqLatency = Date.now() - reqStart;
        return { id: idx + 1, latency: reqLatency, tokens: res.usage?.completion_tokens || 0 };
      });

      const stressResults = await Promise.all(stressPromises);
      const totalStressTime = Date.now() - stressStart;
      const avgLat = (stressResults.reduce((a, b) => a + b.latency, 0) / stressResults.length).toFixed(0);
      const totalTokens = stressResults.reduce((a, b) => a + b.tokens, 0);
      const speed = (totalTokens / (totalStressTime / 1000)).toFixed(1);

      console.log(`🎯 STRESS TEST COMPLETED:`);
      console.log(`   • 5/5 requests succeeded (100% success rate)`);
      console.log(`   • Total Time: ${totalStressTime}ms | Avg Latency: ${avgLat}ms`);
      console.log(`   • Throughput: ${(5 / (totalStressTime / 1000)).toFixed(2)} req/sec | Generation Speed: ${speed} tokens/sec`);
      stressResults.forEach(r => console.log(`     - Req #${r.id}: ${r.latency}ms (${r.tokens} tokens)`));
      break; // Found working and stress tested
    } catch (err) {
      console.log(`❌ [${model}] Failed (${Date.now() - start}ms): ${err.message}`);
    }
  }
}

run().catch(console.error);

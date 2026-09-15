import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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

console.log("===============================================================");
console.log("🧪 CURX AI: COMPREHENSIVE API AUDIT & BENCHMARK");
console.log("===============================================================\n");

// 1. SUPABASE TEST
console.log("▶ [1/3] Testing Supabase Project & Anon Key...");
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log(`  Supabase URL: ${supabaseUrl}`);
console.log(`  Anon Key: ${supabaseKey ? supabaseKey.slice(0, 20) + "..." : "MISSING"}`);

try {
  const sbStart = Date.now();
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error, status } = await supabase.from("patients").select("id").limit(1);
  const sbLatency = Date.now() - sbStart;
  
  if (error) {
    console.log(`  • Supabase responded with HTTP ${status}: ${error.message} (${sbLatency}ms)`);
    if (status === 200 || status === 404 || error.code === 'PGRST116' || error.message.includes('relation "public.patients" does not exist') || error.code === '42P01') {
      console.log("  ✅ Supabase Key is VALID & Project is ONLINE!\n");
    } else {
      console.log("  ⚠️ Supabase returned an unexpected error code:", error.code, "\n");
    }
  } else {
    console.log(`  ✅ Supabase is FULLY OPERATIONAL (${sbLatency}ms)! Data rows received: ${data?.length || 0}\n`);
  }
} catch (err) {
  console.log(`  ❌ Supabase test error: ${err.message}\n`);
}

// 2. NVIDIA NIM QUICK TIMEOUT PROBER
console.log("▶ [2/3] Probing NVIDIA NIM Models for Availability & Latency...");
const openai = new OpenAI({
  apiKey: env.NVIDIA_API_KEY,
  baseURL: env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
  timeout: 10000, // 10s strict timeout per attempt
});

const testModels = [
  env.NVIDIA_MODEL,
  "mistralai/mistral-large-2-instruct",
  "writer/palmyra-med-70b",
  "nv-mistralai/mistral-nemo-12b-instruct",
  "google/gemma-3-12b-it",
  "nvidia/llama-3.1-nemotron-70b-instruct"
].filter(Boolean);

const workingModels = [];

for (const model of testModels) {
  process.stdout.write(`  • Testing '${model}'... `);
  const start = Date.now();
  try {
    const res = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: "State 1 sentence on CYP2C19." }],
      max_tokens: 40,
      temperature: 0.1,
    });
    const lat = Date.now() - start;
    const content = res.choices[0]?.message?.content?.trim().replace(/\n/g, ' ') || '';
    console.log(`✅ OK (${lat}ms) -> "${content.slice(0, 60)}..."`);
    workingModels.push({ model, latency: lat, tokens: res.usage?.completion_tokens || 0 });
  } catch (err) {
    console.log(`❌ FAILED (${Date.now() - start}ms): ${err.message}`);
  }
}

// 3. STRESS TEST ON THE FASTEST WORKING MODEL
if (workingModels.length > 0) {
  // Sort by lowest single latency
  workingModels.sort((a, b) => a.latency - b.latency);
  const bestModel = workingModels[0].model;
  console.log(`\n▶ [3/3] STRESS TEST & CONCURRENCY BENCHMARK on [${bestModel}]`);
  console.log(`  Running 10 concurrent requests simultaneously...\n`);

  const prompts = [
    "CYP2C19 clopidogrel recommendation in 10 words.",
    "CYP2D6 codeine toxicity risk in 10 words.",
    "SLCO1B1 simvastatin myopathy risk in 10 words.",
    "HLA-B*5701 abacavir hypersensitivity in 10 words.",
    "DPYD fluorouracil toxicity in 10 words.",
    "TPMT azathioprine myelosuppression in 10 words.",
    "VKORC1 warfarin sensitivity in 10 words.",
    "CYP3A5 tacrolimus dosing in 10 words.",
    "CYP2C9 celecoxib clearance in 10 words.",
    "UGT1A1 irinotecan toxicity in 10 words."
  ];

  const stressStart = Date.now();
  const stressPromises = prompts.map(async (p, idx) => {
    const reqStart = Date.now();
    try {
      const res = await openai.chat.completions.create({
        model: bestModel,
        messages: [{ role: "user", content: p }],
        max_tokens: 35,
      });
      const lat = Date.now() - reqStart;
      return {
        id: idx + 1,
        success: true,
        latency: lat,
        tokens: res.usage?.completion_tokens || 0,
        prompt: p
      };
    } catch (err) {
      return {
        id: idx + 1,
        success: false,
        latency: Date.now() - reqStart,
        error: err.message,
        prompt: p
      };
    }
  });

  const results = await Promise.all(stressPromises);
  const totalDuration = Date.now() - stressStart;
  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const latencies = passed.map(r => r.latency).sort((a, b) => a - b);
  const avgLat = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(0);
  const minLat = latencies[0];
  const maxLat = latencies[latencies.length - 1];
  const p95Lat = latencies[Math.floor(latencies.length * 0.95)] || maxLat;
  const totalTokens = passed.reduce((acc, r) => acc + r.tokens, 0);
  const throughput = (results.length / (totalDuration / 1000)).toFixed(2);
  const tokenSpeed = (totalTokens / (totalDuration / 1000)).toFixed(1);

  console.log("===============================================================");
  console.log("📊 STRESS TEST RESULTS & EFFICIENCY REPORT");
  console.log("===============================================================");
  console.log(`• Model Tested:             ${bestModel}`);
  console.log(`• Total Requests Sent:      ${results.length}`);
  console.log(`• Successful Requests:      ${passed.length}/${results.length} (${((passed.length / results.length) * 100).toFixed(0)}%)`);
  console.log(`• Total Batch Duration:     ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  console.log(`• Concurrency Throughput:   ${throughput} req/sec`);
  console.log(`• Token Generation Rate:    ${tokenSpeed} tokens/sec (Total: ${totalTokens} tokens)`);
  console.log(`• Latency Metrics:`);
  console.log(`    - Min Latency:          ${minLat}ms`);
  console.log(`    - Avg Latency:          ${avgLat}ms`);
  console.log(`    - P95 Latency:          ${p95Lat}ms`);
  console.log(`    - Max Latency:          ${maxLat}ms`);
  console.log("===============================================================\n");

  console.log("Individual Request Breakdown:");
  results.forEach(r => {
    if (r.success) {
      console.log(`  [Req #${r.id.toString().padStart(2)}] Latency: ${r.latency.toString().padStart(4)}ms | Tokens: ${r.tokens.toString().padStart(2)} | "${r.prompt.slice(0, 30)}..."`);
    } else {
      console.log(`  [Req #${r.id.toString().padStart(2)}] FAILED (${r.latency}ms): ${r.error}`);
    }
  });
} else {
  console.log("❌ No models responded within the timeout window.");
}

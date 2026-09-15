import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    env[key] = val;
  }
});

const NVIDIA_KEY = env.NVIDIA_API_KEY;
const NVIDIA_BASE_URL = env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = env.NVIDIA_MODEL || 'deepseek-ai/deepseek-v4-flash-0731';

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('===============================================================');
console.log('🔬 CURX AI DEEP DIAGNOSTIC & STRESS TEST BENCHMARK');
console.log('===============================================================\n');

async function testSupabaseDeep() {
  console.log('▶ [1/4] Supabase Connectivity & Anon Key Verification');
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log(`  Anon Key (JWT): ${SUPABASE_KEY ? SUPABASE_KEY.slice(0, 20) + '...' : 'NONE'}`);

  const start = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Test auth endpoint
    const authStart = Date.now();
    const authHealthRes = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { 'apikey': SUPABASE_KEY }
    });
    const authLatency = Date.now() - authStart;
    console.log(`  • Auth Server Health: HTTP ${authHealthRes.status} (${authLatency}ms)`);

    // Test query on database
    const dbStart = Date.now();
    const { data, error, status } = await supabase.from('patients').select('count', { count: 'exact', head: true });
    const dbLatency = Date.now() - dbStart;
    
    if (error) {
      console.log(`  • DB Ping (patients table): HTTP ${status} - Note: ${error.message} (${dbLatency}ms)`);
      if (status === 200 || status === 404 || status === 400 || error.code === 'PGRST116' || error.message.includes('relation "public.patients" does not exist') || error.code === '42P01') {
        console.log(`  ✅ Supabase Key is VALID & Authenticated (Database reached successfully)`);
      } else {
        console.log(`  ⚠️ Supabase returned error code: ${error.code} - ${error.message}`);
      }
    } else {
      console.log(`  ✅ Supabase Database Connection SUCCESS! Found table and counted rows (${dbLatency}ms)`);
    }
  } catch (err) {
    console.log(`  ❌ Supabase test exception: ${err.message}`);
  }
  console.log();
}

async function testNvidiaModelsList() {
  console.log('▶ [2/4] NVIDIA NIM API Key & Model Catalogue');
  console.log(`  Endpoint: ${NVIDIA_BASE_URL}/models`);
  const start = Date.now();
  try {
    const res = await fetch(`${NVIDIA_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${NVIDIA_KEY}`,
        'Accept': 'application/json'
      }
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      const models = data.data.map(m => m.id);
      console.log(`  ✅ API Key Status: ACTIVE & VALID (${latency}ms)`);
      console.log(`  • Total Models Accessible: ${models.length}`);
      
      const deepseekModels = models.filter(m => m.toLowerCase().includes('deepseek'));
      const metaModels = models.filter(m => m.toLowerCase().includes('llama-3.1') || m.toLowerCase().includes('llama-3.3'));
      console.log(`  • DeepSeek Models: ${JSON.stringify(deepseekModels)}`);
      console.log(`  • Meta LLaMA Models sample: ${JSON.stringify(metaModels.slice(0, 3))}`);
      console.log();
      return { success: true, models };
    } else {
      const err = await res.text();
      console.log(`  ❌ Model list failed HTTP ${res.status}: ${err}\n`);
      return { success: false, error: err };
    }
  } catch (err) {
    console.log(`  ❌ Network error fetching models: ${err.message}\n`);
    return { success: false, error: err.message };
  }
}

async function runInferenceTest(modelName, maxTokens = 128) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

    const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'user', content: 'What is Clopidogrel? Explain pharmacogenomics impact of CYP2C19 in 2 short bullet points.' }
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
        stream: false
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      const content = choice?.content || choice?.reasoning_content || '';
      return {
        success: true,
        latency,
        model: data.model || modelName,
        content: content.trim(),
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens
      };
    } else {
      const errText = await res.text();
      return { success: false, latency, status: res.status, error: errText };
    }
  } catch (err) {
    return { success: false, latency: Date.now() - start, error: err.message };
  }
}

async function stressTestModel(modelName, concurrentRequests = 5, totalBatches = 2) {
  console.log(`▶ [4/4] STRESS TEST & EFFICIENCY BENCHMARK: ${modelName}`);
  console.log(`  Parameters: ${concurrentRequests} concurrent streams × ${totalBatches} batches (${concurrentRequests * totalBatches} total inferences)\n`);

  const allResults = [];
  const testStart = Date.now();

  for (let batch = 1; batch <= totalBatches; batch++) {
    console.log(`  --- Batch ${batch}/${totalBatches} (${concurrentRequests} concurrent requests dispatched) ---`);
    const batchStart = Date.now();
    
    const prompts = [
      'Explain CYP2D6 metabolizer status for Tamoxifen in 15 words.',
      'Explain TPMT testing before Azathioprine in 15 words.',
      'Explain HLA-B*1502 screening for Carbamazepine in 15 words.',
      'Explain VKORC1 and CYP2C9 for Warfarin in 15 words.',
      'Explain SLCO1B1 for Simvastatin toxicity in 15 words.',
      'Explain DPYD deficiency for 5-FU in 15 words.'
    ];

    const promises = Array.from({ length: concurrentRequests }).map(async (_, idx) => {
      const pIndex = (batch * concurrentRequests + idx) % prompts.length;
      const reqStart = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NVIDIA_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'user', content: prompts[pIndex] }
            ],
            temperature: 0.1,
            max_tokens: 60
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        const latency = Date.now() - reqStart;
        if (res.ok) {
          const data = await res.json();
          const tokens = data.usage?.completion_tokens || 0;
          return { id: idx + 1, batch, success: true, latency, tokens, status: res.status };
        } else {
          const errText = await res.text();
          return { id: idx + 1, batch, success: false, latency, status: res.status, error: errText.slice(0, 100) };
        }
      } catch (err) {
        return { id: idx + 1, batch, success: false, latency: Date.now() - reqStart, error: err.message };
      }
    });

    const batchResults = await Promise.all(promises);
    const batchDuration = Date.now() - batchStart;
    allResults.push(...batchResults);

    const bSuccess = batchResults.filter(r => r.success);
    const bFail = batchResults.filter(r => !r.success);
    const bLatencies = bSuccess.map(r => r.latency).sort((a, b) => a - b);
    const bAvg = bLatencies.length ? (bLatencies.reduce((a,b)=>a+b,0)/bLatencies.length).toFixed(0) : 0;
    const bTokens = bSuccess.reduce((acc, r) => acc + r.tokens, 0);
    const bTokensSec = batchDuration > 0 ? (bTokens / (batchDuration / 1000)).toFixed(1) : 0;

    console.log(`    ✓ Completed in ${batchDuration}ms | Passed: ${bSuccess.length}/${concurrentRequests} | Avg Latency: ${bAvg}ms | Speed: ${bTokensSec} tokens/sec`);
    if (bFail.length > 0) {
      console.log(`    ⚠️ Batch Failures:`, bFail.map(f => `[${f.status || 'ERR'}] ${f.error}`));
    }
  }

  const totalTime = Date.now() - testStart;
  const totalSuccess = allResults.filter(r => r.success);
  const totalFail = allResults.filter(r => !r.success);
  const latencies = totalSuccess.map(r => r.latency).sort((a, b) => a - b);
  const minLatency = latencies[0] || 0;
  const maxLatency = latencies[latencies.length - 1] || 0;
  const avgLatency = latencies.length ? (latencies.reduce((a,b)=>a+b,0)/latencies.length).toFixed(0) : 0;
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const totalGenTokens = totalSuccess.reduce((acc, r) => acc + r.tokens, 0);
  const throughputRPS = ((allResults.length) / (totalTime / 1000)).toFixed(2);
  const overallTokensPerSec = ((totalGenTokens) / (totalTime / 1000)).toFixed(1);

  console.log('\n===============================================================');
  console.log('📊 STRESS TEST & BENCHMARK SUMMARY METRICS');
  console.log('===============================================================');
  console.log(`  • Model Tested:              ${modelName}`);
  console.log(`  • Total Inferences Run:      ${allResults.length}`);
  console.log(`  • Successful Requests:       ${totalSuccess.length} (${((totalSuccess.length / allResults.length) * 100).toFixed(1)}%)`);
  console.log(`  • Failed Requests:           ${totalFail.length}`);
  console.log(`  • Total Time Elapsed:        ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`  • System Request Rate:       ${throughputRPS} req/sec`);
  console.log(`  • Generation Throughput:     ${overallTokensPerSec} tokens/sec`);
  console.log(`  • Latency Distribution:`);
  console.log(`      - Minimum Latency:       ${minLatency}ms`);
  console.log(`      - Median (P50) Latency:  ${p50}ms`);
  console.log(`      - Average Latency:       ${avgLatency}ms`);
  console.log(`      - 95th Percentile (P95): ${p95}ms`);
  console.log(`      - Maximum Latency:       ${maxLatency}ms`);
  console.log('===============================================================\n');
}

async function main() {
  await testSupabaseDeep();
  
  const modelsData = await testNvidiaModelsList();
  
  let modelToTest = NVIDIA_MODEL;
  console.log(`▶ [3/4] Single Test Inference on: ${modelToTest}`);
  let singleTest = await runInferenceTest(modelToTest);
  
  if (!singleTest.success) {
    console.log(`  ⚠️ Inference on '${modelToTest}' failed: [${singleTest.status || 'ERR'}] ${singleTest.error}`);
    // If deepseek-v4-flash is busy or unavailable, try another top model available on key
    const fallbacks = [
      'deepseek-ai/deepseek-coder-6.7b-instruct',
      'meta/llama-3.1-8b-instruct',
      'meta/llama-3.3-70b-instruct'
    ];
    for (const fb of fallbacks) {
      if (modelsData.models && modelsData.models.includes(fb)) {
        console.log(`  🔄 Testing alternative available model '${fb}'...`);
        const fbRes = await runInferenceTest(fb);
        if (fbRes.success) {
          console.log(`  ✅ Alternative Model '${fb}' SUCCESS! (${fbRes.latency}ms)`);
          console.log(`  Response preview: "${fbRes.content.slice(0, 120)}..."`);
          modelToTest = fb;
          singleTest = fbRes;
          break;
        }
      }
    }
  } else {
    console.log(`  ✅ Inference SUCCESS on '${modelToTest}' (${singleTest.latency}ms)!`);
    console.log(`  Tokens: ${singleTest.totalTokens} (Prompt: ${singleTest.promptTokens}, Completion: ${singleTest.completionTokens})`);
    console.log(`  Response Preview:\n  ${singleTest.content.split('\n').join('\n  ')}\n`);
  }

  if (singleTest.success) {
    await stressTestModel(modelToTest, 5, 2);
  } else {
    console.log(`❌ Could not complete stress test because inference calls failed.`);
  }
}

main().catch(err => console.error('Fatal benchmark error:', err));

import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
});

import { generateGeminiChatCompletion } from '../src/lib/ai/gemini.ts';

async function testIntegration() {
  console.log("Testing generateGeminiChatCompletion module...\n");
  const start = Date.now();
  const res = await generateGeminiChatCompletion({
    systemPrompt: "You are a clinical decision support pharmacogenomics assistant. Answer in 2 short bullet points.",
    messages: [
      { role: "user", content: "What is the clinical recommendation for Clopidogrel in a CYP2C19 *2/*2 poor metabolizer?" }
    ],
    temperature: 0.2,
    maxTokens: 150
  });
  const latency = Date.now() - start;

  console.log(`✅ Gemini AI Module SUCCESS (${latency}ms)!`);
  console.log(`• Model: ${res.model}`);
  console.log(`• Message:\n${res.message}`);
  if (res.usage) {
    console.log(`• Usage:`, res.usage);
  }
}

testIntegration().catch(console.error);

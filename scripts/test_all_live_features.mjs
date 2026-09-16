/**
 * Complete Live Endpoints & Internal Feature Diagnostics
 */
const baseUrl = "http://localhost:3000";

async function runFeatureAudit() {
  console.log("=================================================================");
  console.log("🩺 CURX LIVE APPLICATION & INTERNAL FEATURES AUDIT");
  console.log("=================================================================\n");

  const results = {};

  // 1. GET /api/pipeline/status
  console.log("[1/7] Testing Ingestion Pipeline & Database Metrics...");
  try {
    const res = await fetch(`${baseUrl}/api/pipeline/status`);
    const data = await res.json();
    console.log(`  -> Status: HTTP ${res.status} | Pipeline: ${data.status} | Metrics: Genes=${data.liveDatabaseMetrics?.genes}, Meds=${data.liveDatabaseMetrics?.medications}, Conditions=${data.liveDatabaseMetrics?.conditions}`);
    results.pipeline_status = res.ok && data.status === "HEALTHY";
  } catch (err) {
    console.log(`  -> FAILED: ${err.message}`);
    results.pipeline_status = false;
  }

  // 2. GET /api/patient (Security Route Protection Check)
  console.log("\n[2/7] Testing Patient Profile Route & Security Isolation...");
  try {
    const res = await fetch(`${baseUrl}/api/patient`);
    console.log(`  -> Unauthenticated Request Status: HTTP ${res.status} (Protected by Auth Middleware)`);
    results.patient_profile_security = res.status === 401;
  } catch (err) {
    console.log(`  -> FAILED: ${err.message}`);
    results.patient_profile_security = false;
  }

  // 3. GET /api/evidence
  console.log("\n[3/7] Testing Clinical Evidence Layer (CPIC / ClinPGx / OpenFDA)...");
  try {
    const res = await fetch(`${baseUrl}/api/evidence`);
    const data = await res.json();
    console.log(`  -> Status: HTTP ${res.status} | Evidence Sources: ${data.totalEvidenceSources || data.evidenceSources?.length} | Drug Labels: ${data.drugLabelDocuments?.length}`);
    results.evidence_layer = res.ok && (data.evidenceSources?.length > 0 || data.totalEvidenceSources >= 0);
  } catch (err) {
    console.log(`  -> FAILED: ${err.message}`);
    results.evidence_layer = false;
  }

  // 4. GET /api/care/nearby
  console.log("\n[4/7] Testing Geolocation Care Finder (OpenStreetMap Overpass)...");
  try {
    const res = await fetch(`${baseUrl}/api/care/nearby?city=San%20Francisco`);
    const data = await res.json();
    console.log(`  -> Status: HTTP ${res.status} | Facilities Found: ${data.facilities?.length} | Nearest: "${data.facilities?.[0]?.name}" (${data.facilities?.[0]?.type})`);
    results.care_finder = res.ok && data.facilities?.length > 0;
  } catch (err) {
    console.log(`  -> FAILED: ${err.message}`);
    results.care_finder = false;
  }

  // 5. POST /api/risk/evaluate
  console.log("\n[5/7] Testing Deterministic Multi-Axis Risk Engine...");
  try {
    const payload = {
      patientId: "PAT-84920",
      medications: [{ name: "Clopidogrel", dosage: "75mg" }, { name: "Omeprazole", dosage: "20mg" }],
      variants: [{ geneSymbol: "CYP2C19", variantName: "*2/*2", phenotype: "Poor Metabolizer" }],
      conditions: [{ name: "Coronary Artery Disease" }]
    };
    const res = await fetch(`${baseUrl}/api/risk/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    const evalRes = data.evaluation || data;
    console.log(`  -> Status: HTTP ${res.status} | Computed Risk Tier: ${evalRes.overallRisk || evalRes.riskTier} | Score: ${evalRes.riskScore}/100 | Triggers: ${evalRes.factors?.length || evalRes.structuredTrace?.length || 0}`);
    results.risk_engine = res.ok && Boolean(evalRes.overallRisk || evalRes.riskTier);
  } catch (err) {
    console.log(`  -> FAILED: ${err.message}`);
    results.risk_engine = false;
  }

  // 6. POST /api/symptoms/adaptive
  console.log("\n[6/7] Testing Adaptive Symptom Traversal & Differential Reasoning...");
  try {
    const payload = { reportedSymptoms: ["itching", "skin rash", "joint pain"] };
    const res = await fetch(`${baseUrl}/api/symptoms/adaptive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log(`  -> Status: HTTP ${res.status} | Top Candidate: "${data.candidates?.[0]?.name}" (${data.candidates?.[0]?.matchTier}) | Next Question: "${data.nextQuestion?.questionText || 'N/A'}"`);
    results.symptom_engine = res.ok && data.candidates?.length > 0;
  } catch (err) {
    console.log(`  -> FAILED: ${err.message}`);
    results.symptom_engine = false;
  }

  // 7. POST /api/ml/predict
  console.log("\n[7/7] Testing Deep Learning Model API Endpoint (/api/ml/predict)...");
  try {
    const payload = { symptoms: ["chest pain", "breathlessness", "sweating", "dizziness"] };
    const res = await fetch(`${baseUrl}/api/ml/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log(`  -> Status: HTTP ${res.status} | Model: ${data.model_version || data.model} | Top-1 Prediction: "${data.top1?.condition || data.prediction}" (${data.top1?.percentage || data.confidence}) | Attributions: ${data.feature_attributions?.length || 0}`);
    results.ml_predict = res.ok && Boolean(data.top1?.condition || data.prediction || data.top3);
  } catch (err) {
    console.log(`  -> FAILED: ${err.message}`);
    results.ml_predict = false;
  }

  console.log("\n=================================================================");
  console.log("📊 INTERNAL FEATURES VERIFICATION REPORT");
  console.log("=================================================================");
  let allPassed = true;
  for (const [feat, passed] of Object.entries(results)) {
    const mark = passed ? "✅ PASSED" : "❌ FAILED";
    console.log(`  • ${feat.padEnd(25)}: ${mark}`);
    if (!passed) allPassed = false;
  }
  console.log("=================================================================");
  console.log(allPassed ? "🎉 ALL INTERNAL FEATURES OPERATING WITH 100% SUCCESS" : "⚠️ SOME FEATURES REQUIRE ATTENTION");
}

runFeatureAudit();

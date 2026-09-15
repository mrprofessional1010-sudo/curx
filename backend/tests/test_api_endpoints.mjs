import fs from "fs";
import path from "path";

const baseUrl = "http://localhost:3000";

async function testAll() {
  const auditResults = {};
  const evidenceDir = path.resolve("docs/test-evidence/api");
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  // 1. GET /api/pipeline/status
  try {
    const res = await fetch(`${baseUrl}/api/pipeline/status`);
    const data = await res.json();
    auditResults["GET /api/pipeline/status"] = {
      status: res.status,
      ok: res.ok,
      database_status: data.database,
      total_tables: data.table_counts ? Object.keys(data.table_counts).length : 0,
      table_counts: data.table_counts,
      ingestion_runs: data.ingestion_runs?.length
    };
  } catch (err) {
    auditResults["GET /api/pipeline/status"] = { status: "FAILED", error: err.message };
  }

  // 2. GET /api/patient
  try {
    const res = await fetch(`${baseUrl}/api/patient`);
    const data = await res.json();
    auditResults["GET /api/patient"] = {
      status: res.status,
      ok: res.ok,
      patient_id: data.patient?.id,
      medications_count: data.patient?.medications?.length,
      variants_count: data.patient?.variants?.length,
      conditions_count: data.patient?.conditions?.length
    };
  } catch (err) {
    auditResults["GET /api/patient"] = { status: "FAILED", error: err.message };
  }

  // 3. GET /api/evidence
  try {
    const res = await fetch(`${baseUrl}/api/evidence?gene=CYP2D6&drug=Tamoxifen`);
    const data = await res.json();
    auditResults["GET /api/evidence"] = {
      status: res.status,
      ok: res.ok,
      total_evidence: data.evidence?.length,
      sample_guideline: data.evidence?.[0]?.guideline_name,
      sample_source: data.evidence?.[0]?.source_name,
      evidence_level: data.evidence?.[0]?.evidence_level
    };
  } catch (err) {
    auditResults["GET /api/evidence"] = { status: "FAILED", error: err.message };
  }

  // 4. GET /api/care/nearby
  try {
    const res = await fetch(`${baseUrl}/api/care/nearby?lat=37.7749&lon=-122.4194`);
    const data = await res.json();
    auditResults["GET /api/care/nearby"] = {
      status: res.status,
      ok: res.ok,
      total_found: data.totalFound,
      first_facility_name: data.facilities?.[0]?.name,
      first_facility_coords: data.facilities?.[0]?.coordinates,
      all_have_coords: data.facilities?.every((f) => f.coordinates && Number.isFinite(f.coordinates.x) && Number.isFinite(f.coordinates.y))
    };
  } catch (err) {
    auditResults["GET /api/care/nearby"] = { status: "FAILED", error: err.message };
  }

  // 5. POST /api/risk/evaluate (Severe Collision: Intermediate Metabolizer + Tamoxifen + Fluoxetine + DVT)
  try {
    const payload = {
      patientId: "PAT-84920",
      patientVariants: [{ gene: "CYP2D6", diplotype: "*4/*41", phenotype: "Intermediate Metabolizer", activityScore: 0.5 }],
      activeMedications: [{ name: "Tamoxifen", dose: "20mg daily" }, { name: "Fluoxetine", dose: "20mg daily" }],
      conditions: [{ name: "ER+ Breast Cancer" }, { name: "History of Deep Vein Thrombosis" }]
    };
    const res = await fetch(`${baseUrl}/api/risk/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    auditResults["POST /api/risk/evaluate"] = {
      status: res.status,
      ok: res.ok,
      risk_tier: data.riskTier,
      rules_triggered_count: data.structuredTrace?.length,
      rules_summary: data.structuredTrace?.map((t) => `${t.category}: ${t.ruleId} (${t.severity})`),
      deterministic_check: data.riskTier === "SEVERE"
    };
  } catch (err) {
    auditResults["POST /api/risk/evaluate"] = { status: "FAILED", error: err.message };
  }

  // 6. POST /api/symptoms/adaptive
  try {
    const payload = { reportedSymptoms: ["tremor", "hyperreflexia"] };
    const res = await fetch(`${baseUrl}/api/symptoms/adaptive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    auditResults["POST /api/symptoms/adaptive"] = {
      status: res.status,
      ok: res.ok,
      candidate_count: data.candidates?.length,
      top_candidate: data.candidates?.[0]?.name,
      top_candidate_tier: data.candidates?.[0]?.matchTier,
      next_question_symptom: data.nextQuestion?.symptomKey,
      next_question_text: data.nextQuestion?.text
    };
  } catch (err) {
    auditResults["POST /api/symptoms/adaptive"] = { status: "FAILED", error: err.message };
  }

  // Save machine-readable evidence
  const evidencePath = path.join(evidenceDir, "endpoints_test_result.json");
  fs.writeFileSync(evidencePath, JSON.stringify(auditResults, null, 2), "utf-8");
  console.log("AUDIT SUMMARY WRITTEN TO:", evidencePath);
  console.log(JSON.stringify(auditResults, null, 2));
}

testAll();

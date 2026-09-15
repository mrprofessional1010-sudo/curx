import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";

const execFileAsync = promisify(execFile);

export async function GET() {
  try {
    const projectRoot = process.cwd();
    const modelV2Path = path.join(projectRoot, "models", "model_v002_curxsymptomnet", "model_info.json");
    const testMetricsPath = path.join(projectRoot, "ml", "reports", "dl_test_metrics.json");
    const stabilityPath = path.join(projectRoot, "ml", "reports", "multi_seed_stability_curx_symptom_net.json");

    let modelInfo = {};
    let testMetrics = {};
    let stability = {};

    if (fs.existsSync(modelV2Path)) {
      modelInfo = JSON.parse(fs.readFileSync(modelV2Path, "utf-8"));
    }
    if (fs.existsSync(testMetricsPath)) {
      testMetrics = JSON.parse(fs.readFileSync(testMetricsPath, "utf-8"));
    }
    if (fs.existsSync(stabilityPath)) {
      stability = JSON.parse(fs.readFileSync(stabilityPath, "utf-8"));
    }

    return NextResponse.json({
      service: "CURX Deep-Learning Model Inference Service (CURXSymptomNet)",
      model_status: "research_only",
      regulatory_notice: "For research and benchmarking only. Not cleared or approved for clinical diagnosis.",
      clinical_role: "Relative condition ranking / hypothesis generation",
      model_info: modelInfo,
      test_metrics: testMetrics,
      multi_seed_stability: stability,
      api_usage: {
        method: "POST",
        endpoint: "/api/ml/predict",
        body_format: {
          symptoms: ["itching", "skin_rash", "nodal_skin_eruptions"]
        }
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const symptoms = body.symptoms;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid request payload. Expected { symptoms: string[] } with at least one symptom.",
          model_status: "research_only"
        },
        { status: 400 }
      );
    }

    const projectRoot = process.cwd();
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `curx_dl_input_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);

    fs.writeFileSync(tempFile, JSON.stringify({ symptoms }), "utf-8");

    try {
      const pythonExecutable = "python";
      const { stdout } = await execFileAsync(
        pythonExecutable,
        ["-m", "ml.inference.predict_dl", "--input", tempFile],
        {
          cwd: projectRoot,
          timeout: 15000,
          maxBuffer: 1024 * 1024
        }
      );

      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      // Parse JSON from stdout (skipping any warning lines)
      const jsonStart = stdout.indexOf("{");
      if (jsonStart === -1) {
        throw new Error("No JSON response detected from prediction script: " + stdout);
      }
      const rawJson = stdout.substring(jsonStart);
      const prediction = JSON.parse(rawJson);

      return NextResponse.json(prediction);
    } catch (execErr: any) {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      console.error("Execution error running DL inference:", execErr);
      return NextResponse.json(
        {
          error: "Failed to execute DL inference model",
          details: execErr.message,
          model_status: "research_only"
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("Error in /api/ml/predict:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error", model_status: "research_only" },
      { status: 500 }
    );
  }
}

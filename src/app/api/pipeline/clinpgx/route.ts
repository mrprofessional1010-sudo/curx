import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();

  try {
    const isConfigured = Boolean(process.env.CLINPGX_API_KEY && process.env.CLINPGX_API_KEY.trim().length > 0);
    const rawUrl = process.env.CLINPGX_API_BASE_URL || "https://api.clinpgx.org/v1";
    const apiBaseUrl = rawUrl.endsWith("/v1") ? rawUrl : `${rawUrl.replace(/\/+$/, "")}/v1`;

    // 1. Fetch latest ClinPGx live sync runs from data_ingestion_runs
    const { data: runs, error } = await supabase
      .from("data_ingestion_runs")
      .select("*")
      .ilike("dataset_name", "%ClinPGx%")
      .order("completed_at", { ascending: false })
      .limit(5);

    const latestRun = runs && runs.length > 0 ? runs[0] : null;

    // 2. Count ClinPGx evidence sources in Supabase
    const { count: clinpgxEvidenceCount } = await supabase
      .from("evidence_sources")
      .select("*", { count: "exact", head: true })
      .ilike("source_name", "%ClinPGx%");

    // 3. Determine operational sync status
    let syncStatus = "READY_FOR_SYNC (PUBLIC)";
    const authMode = isConfigured ? "AUTHENTICATED" : "PUBLIC";

    if (latestRun?.dataset_name === "ClinPGx Live Sync") {
      if (latestRun.errors && latestRun.errors.length > 0) {
        syncStatus = "SYNC_ERROR";
      } else if (latestRun.rows_inserted > 0 || latestRun.rows_seen > 0) {
        syncStatus = "LIVE_CONNECTED";
      } else {
        syncStatus = "LIVE_CONNECTED (SYNCED_NO_CHANGES)";
      }
    }

    return NextResponse.json({
      status: syncStatus,
      authMode,
      apiBaseUrl,
      evidenceRecordCount: clinpgxEvidenceCount || 0,
      lastSync: latestRun ? {
        datasetName: latestRun.dataset_name,
        completedAt: latestRun.completed_at,
        startedAt: latestRun.started_at,
        rowsSeen: latestRun.rows_seen || 0,
        rowsValid: latestRun.rows_valid || 0,
        rowsInserted: latestRun.rows_inserted || 0,
        rowsUpdated: latestRun.rows_updated || 0,
        rowsSkipped: latestRun.rows_skipped || 0,
        rowsRejected: latestRun.rows_rejected || 0,
        contentHash: latestRun.content_hash,
        errors: latestRun.errors || [],
      } : null,
      recentRuns: (runs || []).map((r: any) => ({
        id: r.id,
        datasetName: r.dataset_name,
        completedAt: r.completed_at,
        rowsInserted: r.rows_inserted,
        errors: r.errors,
      })),
      evaluatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error retrieving ClinPGx pipeline status:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

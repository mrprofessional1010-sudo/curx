# CURX AI Assistant (DeepSeek-V4-Flash / NVIDIA NIM)
**Conversational Clinical Decision Explanation Architecture & Verification Evidence**

---

## 1. Architectural Overview

The CURX AI Assistant provides real-time natural language explanations grounded strictly in CURX's deterministic clinical intelligence.

```
USER
  │
  ▼
[CURX AI Assistant Client] (Next.js React / Glassmorphism Drawer)
  │
  ▼ (Secure HTTPS POST /api/chat)
[Authenticated Supabase Session] (auth.users.id -> patients.user_id)
  │
  ▼
[Intent-Aware Clinical Context Retriever]
  ├── Active Patient Profile (Medications, Genetics, Conditions, Symptoms)
  ├── Plane 01: Deterministic Risk Engine (evaluateDeterministicRisk)
  ├── Evidence Layer (CPIC Guidelines, ClinPGx Annotations, OpenFDA Boxed Warnings)
  └── Emergency Safety Gate (Critical Override Detection)
  │
  ▼
[System Prompt & Safety Guardrails Filter]
  │
  ▼ (Encrypted Server-Side API Call)
[NVIDIA NIM Endpoint] (https://integrate.api.nvidia.com/v1)
  Model: deepseek-ai/deepseek-v4-flash-0731
  │
  ▼
[Conversation Storage & RLS Persistence] (public.chat_conversations, public.chat_messages)
  │
  ▼
[Natural-Language Explanation & Grounded Evidence Citation Chips]
```

---

## 2. Strict Clinical Boundaries & Invariants

| Domain | CURX Deterministic Authority | DeepSeek AI Role |
| :--- | :--- | :--- |
| **Risk Scoring & Tiers** | Pre-computed by deterministic rules (`evaluateDeterministicRisk`) | Explains contributing factor traces; **never calculates or overrides risk** |
| **Diagnosis** | Verified patient conditions from Supabase | **Never diagnoses or speculates** |
| **Prescribing / Dosing** | Active verified medications | **Never prescribes or alters doses/frequencies** |
| **Evidence & Citations** | Curated CPIC, ClinPGx, OpenFDA records | **Cites only supplied records; zero fabricated citations** |
| **Emergency Protocols** | Immediate triage override triggers | **Escalates immediately; prohibited from downgrading** |
| **Healthcare Facilities** | Real OpenStreetMap coordinates & verified clinics | **References verified OSM listings; zero fabricated clinics** |
| **Privacy & Authorization** | Supabase Row-Level Security (RLS) & server checks | **Cannot access foreign patient records or reveal secrets** |

---

## 3. Server-Side Configuration

```ini
# .env.local (Server-Side Only - Never Exposed to Client)
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=deepseek-ai/deepseek-v4-flash-0731
NVIDIA_API_KEY=<configured-server-secret>
```

---

## 4. API Endpoints

### `POST /api/chat`
* **Authentication**: Requires active Supabase session (`supabase.auth.getUser()`).
* **Request**:
  ```json
  {
    "message": "Why is my medication risk high?",
    "conversationId": "optional-uuid"
  }
  ```
* **Response**:
  ```json
  {
    "message": "Your computed risk is categorized as HIGH (Risk Score: 75/100)...",
    "conversationId": "06b4d320-...",
    "metadata": {
      "model": "deepseek-ai/deepseek-v4-flash-0731",
      "riskTier": "HIGH",
      "riskScore": 75,
      "evidence": [
        {
          "sourceName": "CPIC",
          "title": "CYP2C19 Poor Metabolizer significantly reduces Clopidogrel active metabolite formation."
        }
      ]
    }
  }
  ```

### `GET /api/chat`
* Lists past conversations (`chat_conversations`) or fetches message history for a specific conversation (`chat_messages`) filtered strictly by `auth.uid() = user_id`.

### `DELETE /api/chat?conversationId=...`
* Deletes conversation owned by authenticated user.

---

## 5. Automated Verification Matrix

| Test Category | Test Case | Target | Result |
| :--- | :--- | :--- | :--- |
| **Authentication** | Session Validation | `POST /api/chat` rejects unauthenticated users with HTTP 401 | **PASSED** |
| **Authorization** | Cross-User Isolation | User B receives 403/404 when querying User A's `conversationId` | **PASSED** |
| **Deterministic Boundary** | Risk Grounding | Pre-computed risk tiers (High/Moderate/Low) passed directly | **PASSED** |
| **Evidence Grounding** | Source Citation | CPIC / ClinPGx / OpenFDA evidence cited verbatim | **PASSED** |
| **Emergency Safety** | Emergency Invariant | Severe chest pain / anaphylaxis triggers urgent protocol | **PASSED** |
| **Prompt Injection** | Jailbreak Resistance | "Ignore previous instructions" & secret exfiltration blocked | **PASSED** |
| **Empty Profile** | Dynamic Guidance | Incomplete profiles routed to onboarding without hallucination | **PASSED** |
| **E2E Browser Automation** | Full Playwright Flow | Login → Dashboard → AI Chat Drawer → Query → Verified Response | **PASSED** |

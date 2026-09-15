# Test Evidence: Authentication, Session & Routing Protection

## Overview
CURX secures all clinical intelligence views using Supabase Authentication, Next.js server-side session middleware, and database Row-Level Security (RLS).

## Verified Test Matrix

| Test Case | Scenario | Expected | Actual | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Unauthenticated `/dashboard` Access | Redirect to `/login?redirect=/dashboard` | Redirected to `/login` | ✅ PASSED | `curx-full-flow.spec.ts:36` |
| **AUTH-02** | Unauthenticated `/onboarding` Access | Redirect to `/login?redirect=/onboarding` | Redirected to `/login` | ✅ PASSED | `curx-full-flow.spec.ts:39` |
| **AUTH-03** | Existing Demo Login | Authenticate & load Elena Rostova (`PAT-84920`) | Loaded `PAT-84920` dashboard | ✅ PASSED | `screenshots/01-overview.png` |
| **AUTH-04** | New User Without Profile | Authenticate & route to `/onboarding` | Loaded `/onboarding` wizard | ✅ PASSED | `screenshots/09-onboarding-step1.png` |
| **AUTH-05** | Profile Persistence across Logout/Login | Saved profile persists on re-authentication | Persisted customized user data | ✅ PASSED | `screenshots/12-personalized-dashboard.png` |
| **AUTH-06** | Cross-User ID Tampering | User A querying User B's `patient_id` | HTTP 403 Forbidden | ✅ PASSED | `curx-full-flow.spec.ts:287` |
| **AUTH-07** | Session Signout | Clear session and return to `/login` | Cleared & redirected | ✅ PASSED | `screenshots/08-logout.png` |

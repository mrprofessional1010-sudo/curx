# Test Evidence: Care Finder (OpenStreetMap / Nominatim)

## Verification Details
- **Test ID**: `E2E-CARE-FINDER-PERSONALIZATION`
- **Execution Date**: 2026-09-14
- **Automated Runner**: Playwright (Chromium)
- **Status**: ✅ **VERIFIED WORKING**

## Core Features Verified
1. **User Location Continuity**:
   - Care Finder retrieves facilities scoped to the authenticated patient's location (e.g. `Chicago`, `Boston`, or `San Francisco`).
2. **Coordinate Normalization**:
   - Proper geographic bounds transformation from lat/lon to map coordinates `{ x: number, y: number }` without runtime undefined errors.
3. **Facility-Level Directory**:
   - Displays medical centers, regional hospitals, and oncology clinics without ranking individual clinicians or claiming efficacy outcomes.

## Evidence Artifacts
- Screenshot: `docs/test-evidence/screenshots/07-care-finder.png`

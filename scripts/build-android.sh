#!/bin/bash
# ─────────────────────────────────────────────────────────
# LUMA V1 — Android Build & Submit Script
#
# Prerequisites:
#   1. EAS CLI installed: npm install -g eas-cli
#   2. Logged in to Expo: eas login
#   3. Google Play Console service account key at:
#      apps/mobile/google-services-key.json
#   4. google-services.json from Firebase Console at:
#      apps/mobile/google-services.json
#
# Usage:
#   ./scripts/build-android.sh [build|submit|both]
# ─────────────────────────────────────────────────────────

set -euo pipefail

COMMAND="${1:-both}"
MOBILE_DIR="apps/mobile"

echo "========================================="
echo "  LUMA Android Build & Submit"
echo "========================================="

# ─── Checks ────────────────────────────────────────────
check_prerequisites() {
  echo "[Check] Verifying prerequisites..."

  if ! command -v eas &> /dev/null; then
    echo "ERROR: eas-cli not found. Install with: npm install -g eas-cli"
    exit 1
  fi

  if [ ! -f "${MOBILE_DIR}/google-services.json" ]; then
    echo "WARNING: google-services.json not found."
    echo "  Download from Firebase Console > Project Settings > Android app"
    echo "  Save to: ${MOBILE_DIR}/google-services.json"
    echo ""
    read -p "Continue without Firebase? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi

  echo "[Check] Prerequisites OK"
  echo ""
}

# ─── Build ─────────────────────────────────────────────
build_android() {
  echo "[1/2] Building Android App Bundle (production)..."
  echo ""

  cd "${MOBILE_DIR}"

  # EAS Build handles signing automatically:
  # - First time: generates upload keystore and stores in EAS
  # - Subsequent: reuses the stored keystore
  eas build \
    --platform android \
    --profile production \
    --non-interactive

  echo ""
  echo "Build submitted to EAS. Check status:"
  echo "  eas build:list --platform android"
  echo ""

  cd -
}

# ─── Submit ────────────────────────────────────────────
submit_android() {
  echo "[2/2] Submitting to Google Play Console..."
  echo ""

  if [ ! -f "${MOBILE_DIR}/google-services-key.json" ]; then
    echo "ERROR: Google Play service account key not found."
    echo ""
    echo "To create one:"
    echo "  1. Go to Google Play Console > Setup > API access"
    echo "  2. Create or link a Google Cloud project"
    echo "  3. Create a service account with 'Release manager' role"
    echo "  4. Download the JSON key"
    echo "  5. Save to: ${MOBILE_DIR}/google-services-key.json"
    exit 1
  fi

  cd "${MOBILE_DIR}"

  eas submit \
    --platform android \
    --profile production \
    --non-interactive

  echo ""
  echo "Submitted to Google Play Console (internal track, draft)."
  echo "Next steps:"
  echo "  1. Go to Google Play Console"
  echo "  2. Review the draft release"
  echo "  3. Add screenshots and store listing"
  echo "  4. Promote to production when ready"

  cd -
}

# ─── Main ──────────────────────────────────────────────
check_prerequisites

case "${COMMAND}" in
  build)
    build_android
    ;;
  submit)
    submit_android
    ;;
  both)
    build_android
    submit_android
    ;;
  *)
    echo "Usage: $0 [build|submit|both]"
    exit 1
    ;;
esac

echo ""
echo "========================================="
echo "  Done!"
echo "========================================="

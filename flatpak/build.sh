#!/usr/bin/env bash
# build.sh — Build and optionally run the Claude Desktop Flatpak locally
#
# Usage:
#   ./build.sh           — build only
#   ./build.sh --run     — build then launch the app
#   ./build.sh --install — build then install system-wide (user install)
#   ./build.sh --lint    — run flatpak-builder-lint on the manifest

set -euo pipefail

APP_ID="io.github.tayyabtahir143.ClaudeDesktop"
MANIFEST="${APP_ID}.yml"
BUILD_DIR="build-dir"
REPO_DIR="repo"

WORK_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${WORK_DIR}"

# Check generated-sources.json exists
if [ ! -f "generated-sources.json" ]; then
  echo "[ERROR] generated-sources.json not found!"
  echo "        Run './setup.sh' first to generate it."
  exit 1
fi

MODE="${1:-}"

# ── Lint only ────────────────────────────────────────────────────────────────
if [ "${MODE}" = "--lint" ]; then
  echo "Running flatpak-builder-lint..."
  flatpak run --command=flatpak-builder-lint org.flatpak.Builder \
    manifest "${MANIFEST}" || true
  flatpak run --command=flatpak-builder-lint org.flatpak.Builder \
    appstream "${APP_ID}.metainfo.xml" || true
  exit 0
fi

# ── Build ────────────────────────────────────────────────────────────────────
echo "========================================"
echo " Building ${APP_ID}"
echo "========================================"
echo ""

flatpak-builder \
  --user \
  --install \
  --force-clean \
  --repo="${REPO_DIR}" \
  "${BUILD_DIR}" \
  "${MANIFEST}"

echo ""
echo "Build complete!"

# ── Run ─────────────────────────────────────────────────────────────────────
if [ "${MODE}" = "--run" ]; then
  echo ""
  echo "Launching Claude Desktop..."
  flatpak run "${APP_ID}"
fi

# ── Install info ─────────────────────────────────────────────────────────────
if [ "${MODE}" = "--install" ]; then
  echo ""
  echo "Installed. Launch with:"
  echo "  flatpak run ${APP_ID}"
fi

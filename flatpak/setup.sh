#!/usr/bin/env bash
# setup.sh — Prepare everything needed to build the Claude Desktop Flatpak
#
# Run this ONCE before building with flatpak-builder.
# It will:
#   1. Check and install prerequisites
#   2. Clone the app source
#   3. Generate generated-sources.json (offline npm cache manifest)
#   4. Patch the manifest with the correct git commit hash
#
# Usage:  ./setup.sh
# After:  ./build.sh   (to build and test locally)

set -euo pipefail

APP_ID="io.github.tayyabtahir143.ClaudeDesktop"
APP_REPO="https://github.com/tayyabtahir143/ClaudeDesktop"
MANIFEST="${APP_ID}.yml"
WORK_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_DIR="${WORK_DIR}/_tmp_app_source"

echo "========================================"
echo " Claude Desktop — Flatpak Setup"
echo "========================================"

# ── 1. Check prerequisites ──────────────────────────────────────────────────
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "[ERROR] '$1' not found. Install it and re-run."
    echo "        On Fedora: sudo dnf install $2"
    exit 1
  fi
}

echo ""
echo "[1/5] Checking prerequisites..."

check_cmd flatpak-builder "flatpak-builder"
check_cmd git "git"
check_cmd python3 "python3"
check_cmd pip3 "python3-pip"
check_cmd node "nodejs"
check_cmd npm "npm"

# Install flatpak-node-generator if not present
if ! python3 -c "import aiohttp" &>/dev/null; then
  echo "      Installing aiohttp (needed by flatpak-node-generator)..."
  pip3 install --user aiohttp
fi

if ! command -v flatpak-node-generator &>/dev/null; then
  echo "      Installing flatpak-node-generator..."
  pip3 install --user flatpak-node-generator
  # Add user bin to PATH if needed
  export PATH="$HOME/.local/bin:$PATH"
fi

echo "      All prerequisites OK."

# ── 2. Clone app source temporarily to get package-lock.json ───────────────
echo ""
echo "[2/5] Cloning app source to get package-lock.json..."

rm -rf "${TMP_DIR}"
git clone --depth=1 "${APP_REPO}" "${TMP_DIR}"

# Get the exact commit hash (for manifest pinning)
COMMIT_HASH=$(git -C "${TMP_DIR}" rev-parse HEAD)
echo "      Latest commit: ${COMMIT_HASH}"

# ── 3. Generate generated-sources.json ─────────────────────────────────────
echo ""
echo "[3/5] Generating generated-sources.json from package-lock.json..."

# Ensure we have a package-lock.json
if [ ! -f "${TMP_DIR}/package-lock.json" ]; then
  echo "      package-lock.json not found — running npm install to generate it..."
  (cd "${TMP_DIR}" && npm install --package-lock-only)
fi

# Run flatpak-node-generator
# This reads package-lock.json and generates the offline npm cache sources
python3 -m flatpak_node_generator \
  --no-devel \
  npm \
  "${TMP_DIR}/package-lock.json" \
  -o "${WORK_DIR}/generated-sources.json"

echo "      generated-sources.json created ($(wc -l < "${WORK_DIR}/generated-sources.json") lines)"

# ── 4. Patch manifest with pinned commit hash ───────────────────────────────
echo ""
echo "[4/5] Pinning manifest to commit ${COMMIT_HASH}..."

# Replace 'branch: main' with 'commit: <hash>' in the manifest
sed -i \
  "s|branch: main|commit: ${COMMIT_HASH}|g" \
  "${WORK_DIR}/${MANIFEST}"

echo "      Manifest updated."

# ── 5. Install required Flatpak runtimes ────────────────────────────────────
echo ""
echo "[5/5] Installing required Flatpak runtimes (if not already installed)..."

flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo 2>/dev/null || true

flatpak install --user --noninteractive flathub \
  org.freedesktop.Platform//23.08 \
  org.freedesktop.Sdk//23.08 \
  org.freedesktop.Sdk.Extension.node20//23.08 \
  2>/dev/null || echo "      (runtimes may already be installed — continuing)"

# ── Cleanup ─────────────────────────────────────────────────────────────────
rm -rf "${TMP_DIR}"

echo ""
echo "========================================"
echo " Setup complete!"
echo "========================================"
echo ""
echo " Next steps:"
echo "   ./build.sh          — build and test locally"
echo "   ./build.sh --run    — build and immediately launch the app"
echo ""

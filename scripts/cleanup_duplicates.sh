#!/usr/bin/env bash
# FIX #7+#8: Remove duplicate frontend source files.
#
# Canonical locations:
#   - Pages:      frontend/src/pages/
#   - Components: frontend/src/components/
#   - Libs:       frontend/src/lib/
#
# The following files in frontend/src/ ROOT are duplicates of files in
# the canonical directories and must be deleted. App.tsx imports from
# the canonical paths only.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT_DIR/frontend/src"

echo "Removing duplicate files from frontend/src/ root..."

DUPLICATES=(
  # Duplicate pages (canonical versions are in src/pages/)
  "$SRC/Dashboard.tsx"
  "$SRC/Landing.tsx"
  "$SRC/SnagDetail.tsx"
  "$SRC/LoginPage.tsx"
  "$SRC/CrewPage.tsx"

  # Duplicate components (canonical versions are in src/components/)
  "$SRC/AuthGuard.tsx"
  "$SRC/UserBadge.tsx"
  "$SRC/Layout.tsx"

  # Duplicate lib modules (canonical versions are in src/lib/)
  "$SRC/AuthContext.tsx"
  "$SRC/auth.ts"
  "$SRC/api.ts"
  "$SRC/api.types.ts"
  "$SRC/userStore.ts"

  # Old Layout duplicate in pages/ (canonical is in components/)
  "$SRC/pages/Layout.tsx"

  # Old non-auth-aware Layout in components/
  "$SRC/components/Layout.tsx"
)

removed=0
for file in "${DUPLICATES[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  Deleted: ${file#$ROOT_DIR/}"
    ((removed++))
  fi
done

# Also remove the committed bundle.js from repo root (FIX #24 LOW)
BUNDLE="$ROOT_DIR/bundle.js"
if [ -f "$BUNDLE" ]; then
  rm "$BUNDLE"
  echo "  Deleted: bundle.js (committed build artifact)"
  ((removed++))
fi

echo ""
echo "Removed $removed duplicate/dead files."
echo "Canonical source structure:"
echo "  frontend/src/App.tsx           (entry point)"
echo "  frontend/src/main.tsx          (React root)"
echo "  frontend/src/lib/              (api, auth, utils, stores)"
echo "  frontend/src/components/       (Layout, AuthGuard, UserBadge)"
echo "  frontend/src/pages/            (all page components)"

#!/usr/bin/env bash
# generate.sh — YAML-to-Code Generator entry point (Linux/macOS/Git Bash)
# Usage: ./generate.sh generate --spec <yaml> --target <vue|spring|diagrams> --output <dir>
#        ./generate.sh validate --spec <yaml> [--strict-behavior]
#        ./generate.sh puml-to-yaml --input <.puml> --output <.yaml>
#        ./generate.sh yaml-to-puml --spec <yaml> --output <.puml>
#        ./generate.sh yaml-to-diagrams --spec <yaml> --output <dir>
#        ./generate.sh inspect --spec <yaml> --stage <stage>
#
# This script wraps the TypeScript generator with prerequisite checks
# and user-friendly error messages.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   YAML-to-Code Generator v2.0.0     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── Prerequisites ──────────────────────────────────────────────────────

check_command() {
    if ! command -v "$1" &>/dev/null; then
        echo -e "${RED}❌ Required: $1${NC}  Install from $2"
        exit 1
    fi
}

check_command node "https://nodejs.org"
check_command npm "https://nodejs.org"

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required (found v$NODE_VERSION)${NC}"
    exit 1
fi

# ── Install dependencies if needed ──────────────────────────────────────

if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm ci --prefix "$SCRIPT_DIR" --silent
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
fi

# ── Run the generator ───────────────────────────────────────────────────

echo -e "${CYAN}▶ Running generator...${NC}"
npx tsx "$SCRIPT_DIR/src/cli.ts" "$@"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Done.${NC}"
else
    echo ""
    echo -e "${RED}❌ Generation failed with exit code $EXIT_CODE${NC}"
fi

exit $EXIT_CODE

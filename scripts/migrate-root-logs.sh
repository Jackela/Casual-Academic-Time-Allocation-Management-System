#!/usr/bin/env bash
# migrate-root-logs.sh
# Purpose: Migrate polluted log files from root to logs/ directory
# Usage: bash scripts/migrate-root-logs.sh

set -euo pipefail

echo "🧹 Starting root directory cleanup..."

# Ensure logs directory exists
mkdir -p logs/archived-root-logs

# Timestamp for archive
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_DIR="logs/archived-root-logs/${TIMESTAMP}"
mkdir -p "$ARCHIVE_DIR"

# Log files to migrate
LOG_FILES=(
  "backend.log"
  "backend-dev.log"
  "backend-e2e.log"
  "frontend-dev.log"
  "frontend-e2e.log"
  "testci.log"
)

# Temporary/junk files to delete
JUNK_FILES=(
  "CON"
  "nul"
  "patch.tmp"
)

# Migrate log files
echo "📦 Migrating log files to ${ARCHIVE_DIR}..."
for file in "${LOG_FILES[@]}"; do
  if [ -f "$file" ]; then
    mv "$file" "$ARCHIVE_DIR/"
    echo "  ✓ Moved: $file → ${ARCHIVE_DIR}/"
  else
    echo "  ⊘ Not found: $file"
  fi
done

# Delete junk files
echo "🗑️  Removing junk files..."
for file in "${JUNK_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo "  ✓ Deleted: $file"
  else
    echo "  ⊘ Not found: $file"
  fi
done

# Create .gitkeep in logs directory
touch logs/.gitkeep

echo ""
echo "✅ Cleanup complete!"
echo "📊 Summary:"
echo "   - Logs archived to: ${ARCHIVE_DIR}"
echo "   - Junk files removed"
echo ""
echo "Next steps:"
echo "  1. Review archived logs: ls -lh ${ARCHIVE_DIR}"
echo "  2. Update .gitignore: git add .gitignore"
echo "  3. Verify: git status"

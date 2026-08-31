#!/bin/bash
# ============================================================
# Setup Global Agent Skills
# Menghubungkan skill global (~/.agents/skills/) ke project lokal
# ============================================================
#
# Cara pakai:
#   cd /path/to/project
#   bash /path/to/setup-global-skills.sh
#
# Atau dari project ini:
#   bash scripts/setup-global-skills.sh
# ============================================================

set -e

GLOBAL_SKILLS_DIR="$HOME/.agents/skills"
PROJECT_AGENTS_DIR=".agents"

# Pastikan global skills directory ada
if [ ! -d "$GLOBAL_SKILLS_DIR" ]; then
  echo "❌ Global skills directory tidak ditemukan: $GLOBAL_SKILLS_DIR"
  echo "   Jalankan script ini dari project yang sudah memiliki skill,"
  echo "   atau buat manual: mkdir -p ~/.agents/skills"
  exit 1
fi

# Cek apakah sudah ada .agents di project ini
if [ -e "$PROJECT_AGENTS_DIR" ]; then
  echo "⚠️  $PROJECT_AGENTS_DIR sudah ada di project ini."
  echo "   Isi:"
  ls -1 "$PROJECT_AGENTS_DIR"
  echo ""
  read -p "   Hapus dan buat junction baru? (y/N) " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "   Dibatalkan."
    exit 0
  fi
  rm -rf "$PROJECT_AGENTS_DIR"
fi

# Buat junction (Windows) atau symlink (Linux/Mac)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
  # Windows: gunakan junction (tidak perlu admin)
  PROJECT_FULL=$(cygpath -w "$(pwd)")
  GLOBAL_FULL=$(cygpath -w "$GLOBAL_SKILLS_DIR")
  cmd //c "mklink /J ${PROJECT_FULL}\\.agents ${GLOBAL_FULL}"
else
  # Linux/Mac: gunakan symlink
  ln -s "$GLOBAL_SKILLS_DIR" "$PROJECT_AGENTS_DIR"
fi

echo ""
echo "✅ Global skills terhubung ke project ini!"
echo ""
echo "📂 Skills yang tersedia:"
ls -1 "$PROJECT_AGENTS_DIR"/*.md 2>/dev/null | while read f; do
  echo "   • $(basename "$f" .md)"
done

echo ""
echo "💡 Untuk menggunakan skill di CLAUDE.md, tambahkan:"
echo "   @.agents/adversarial-review.md"
echo "   @.agents/security-hardening.md"
echo "   @.agents/performance-audit.md"
echo "   @.agents/database-migration-review.md"
echo "   @.agents/react-component-audit.md"

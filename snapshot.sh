#!/usr/bin/env bash
# Capture current OS config state into this repo and push.
# Run from any directory — it always operates on the repo it lives in.
#
# What gets snapshotted:
#   - Zen browser mods + keyboard shortcuts (from active profile)
#   - GNOME enabled-extensions list        (written into sync-gnome.sh)
#   - Dotfiles are symlinked so always current; no action needed
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/colors.sh"

# ─── Zen ──────────────────────────────────────────────────────────────────────

log_section "Zen browser"

ZEN_PROFILE_PATH=$(grep '^Path=' "$HOME/.config/zen/profiles.ini" 2>/dev/null | head -1 | cut -d= -f2 || true)

if [[ -z "$ZEN_PROFILE_PATH" ]]; then
    log_warn "No Zen profile found — skipping"
else
    ZEN_PROFILE="$HOME/.config/zen/$ZEN_PROFILE_PATH"
    DEST="$SCRIPT_DIR/dotfiles/.config/zen"
    mkdir -p "$DEST"

    for f in zen-themes.json zen-keyboard-shortcuts.json; do
        if [[ -f "$ZEN_PROFILE/$f" ]]; then
            cp "$ZEN_PROFILE/$f" "$DEST/$f"
            log_info "Captured $f"
        else
            log_warn "$f not found in profile — skipping"
        fi
    done
fi

# ─── GNOME ────────────────────────────────────────────────────────────────────

log_section "GNOME"

if ! command -v gsettings &>/dev/null; then
    log_warn "gsettings not available — skipping GNOME snapshot"
else
    ENABLED_EXTS=$(gsettings get org.gnome.shell enabled-extensions 2>/dev/null || true)

    if [[ -n "$ENABLED_EXTS" ]]; then
        # Update the enabled-extensions line in sync-gnome.sh
        SYNC="$SCRIPT_DIR/sync-gnome.sh"
        if grep -q "gnome-extensions enable\|enabled-extensions" "$SYNC"; then
            # Rewrite the gsettings set line for enabled-extensions if present,
            # otherwise just report — sync-gnome.sh manages extensions via
            # gnome-extensions enable calls, not a single gsettings set.
            log_info "Enabled extensions: $ENABLED_EXTS"
            log_info "(sync-gnome.sh manages extensions individually — no rewrite needed)"
        fi
    fi
fi

# ─── Git ──────────────────────────────────────────────────────────────────────

log_section "Git"

cd "$SCRIPT_DIR"

if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    log_info "Nothing changed — repo already up to date"
    exit 0
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
CHANGED=$(git diff --name-only; git ls-files --others --exclude-standard)
SUMMARY=$(echo "$CHANGED" | sed 's|dotfiles/.config/zen/||g' | sort -u | paste -sd ', ')

git add -A
git commit -m "snapshot: $TIMESTAMP — $SUMMARY"
git push

log_info "Snapshot committed and pushed."

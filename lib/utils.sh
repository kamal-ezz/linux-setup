#!/usr/bin/env bash

pkg_installed() {
    rpm -q "$1" &>/dev/null
}

cmd_exists() {
    command -v "$1" &>/dev/null
}

user_in_group() {
    id -nG "$USER" | tr ' ' '\n' | grep -qx "$1"
}

add_dnf_repo_from_url() {
    local url="$1"

    # DNF5 (Fedora 41+): addrepo --from-repofile
    if sudo dnf config-manager addrepo --from-repofile="$url" 2>/dev/null; then
        return 0
    fi

    # Fallback: download the .repo file directly — works on DNF4 and DNF5
    local filename
    filename=$(basename "${url%%\?*}")
    if curl -fsSL "$url" | sudo tee "/etc/yum.repos.d/${filename}" > /dev/null; then
        return 0
    fi

    log_warn "Could not add repo from $url — skipping"
    return 1
}

# Install multiple packages in one dnf call, skipping already-installed ones
dnf_install_bulk() {
    local to_install=()
    for pkg in "$@"; do
        if pkg_installed "$pkg"; then
            log_warn "$pkg already installed, skipping"
        else
            to_install+=("$pkg")
        fi
    done
    if [[ ${#to_install[@]} -eq 0 ]]; then
        return
    fi
    log_info "Installing: ${to_install[*]}"
    sudo dnf install -y "${to_install[@]}"
}

err_handler() {
    log_error "Script failed at line $1. Check $LOG_FILE for details."
    exit 1
}

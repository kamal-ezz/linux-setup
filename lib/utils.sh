#!/usr/bin/env bash

pkg_installed() {
    rpm -q "$1" &>/dev/null
}

cmd_exists() {
    command -v "$1" &>/dev/null
}

dnf_install() {
    local pkg="$1"
    if pkg_installed "$pkg"; then
        log_warn "$pkg already installed, skipping"
    else
        log_info "Installing $pkg..."
        sudo dnf install -y "$pkg" 2>&1 | tee -a "$LOG_FILE"
    fi
}

err_handler() {
    log_error "Script failed at line $1. Check $LOG_FILE for details."
    exit 1
}

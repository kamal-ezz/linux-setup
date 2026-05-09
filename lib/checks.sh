#!/usr/bin/env bash

preflight_checks() {
    log_section "Section 1: Pre-flight Checks"

    if [[ $EUID -eq 0 ]]; then
        log_error "Do not run this script as root. Run as your regular user."
        exit 1
    fi
    log_info "Running as user: $USER"

    if ! source /etc/os-release 2>/dev/null || [[ "$ID" != "fedora" ]]; then
        log_error "This script requires Fedora. Detected: ${ID:-unknown}"
        exit 1
    fi
    log_info "Fedora $VERSION_ID detected"

    if ! sudo -v 2>/dev/null; then
        log_error "sudo access is required but not available."
        exit 1
    fi
    log_info "sudo access confirmed"

    # Keep sudo alive throughout the script
    ( while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null ) &
    SUDO_KEEPALIVE_PID=$!
    trap "kill $SUDO_KEEPALIVE_PID 2>/dev/null; err_handler \$LINENO" ERR
    trap "kill $SUDO_KEEPALIVE_PID 2>/dev/null" EXIT

    if ! curl -s --head --max-time 5 https://fedoraproject.org | grep -q "200\|301\|302"; then
        log_error "No internet connection detected. Please connect and retry."
        exit 1
    fi
    log_info "Network connectivity confirmed"

    local free_gb
    free_gb=$(df -BG / | awk 'NR==2 {gsub("G",""); print $4}')
    if [[ "$free_gb" -lt 20 ]]; then
        log_error "Insufficient disk space: ${free_gb}GB free, 20GB required."
        exit 1
    fi
    log_info "Disk space OK: ${free_gb}GB free"
}

#!/usr/bin/env bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC}  $*" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[SKIP]${NC}  $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"
}

log_section() {
    echo -e "\n${BLUE}══════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE} $*${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}══════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
}

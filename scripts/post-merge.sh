#!/bin/bash
set -euo pipefail
npm install --no-audit --no-fund
npm run db:push

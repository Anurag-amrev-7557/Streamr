#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install root dependencies (frontend)
npm install

# Build frontend
npm run build

# Install server dependencies
cd server
npm install

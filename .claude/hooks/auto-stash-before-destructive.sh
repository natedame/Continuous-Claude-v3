#!/bin/bash
# Auto-stash before destructive operations
# Wrapper for the TypeScript hook

DIR="$(dirname "$0")"
exec node "$DIR/dist/auto-stash-before-destructive.mjs"

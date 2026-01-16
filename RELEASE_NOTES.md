# Release Notes - v1.3.1

## 🌟 Highlights

*   **Robust Backend Management**: Significantly improved the server management script (`backend.sh`) with auto-updates, container health checks, and better error handling.
*   **Avatar System Fixes**: Resolved issues with avatar display URLs by migrating to relative paths and specific frontend helpers.
*   **Database Tools**: Enhanced database management tools directly within the management CLI for easier debugging.

## 🚀 Changes

*   [Fix] `backend.sh` now automatically discards local changes before pulling updates to prevent merge conflicts.
*   [Fix] Added checks to ensure the database container is running before attempting database operations in the CLI.
*   [Fix] Updated frontend components (`UserProfile`, `GroupDetails`, `Dashboard`) to correctly construct avatar URLs from relative paths.
*   [Fix] `docker-compose.prod.yml` updated to remove obsolete version attributes.

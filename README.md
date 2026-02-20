# CloudCrypt

Encrypted cloud file storage with client-side encryption key management.

## Quick Start with Docker

### Production

```bash
# 1. Configure your environment
cp .env.example .env
# Edit .env — at minimum set FILE_MASTER_KEY to a strong secret

# 2. Build and start
docker compose up -d

# App is now running at http://localhost
```

### Development

```bash
# Start with hot-reloading for both frontend and backend
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Frontend (Vite HMR):  http://localhost:5173
# Backend (Air reload):  http://localhost:8443
```

## Configuration

All configuration is done via environment variables, set in `docker-compose.yml` or a `.env` file.

| Variable | Default | Description |
|---|---|---|
| `FILE_MASTER_KEY` | `changeme` | Server-side encryption key — **change this in production** |
| `PORT` | `8443` | Backend listen port |
| `CORS_ALLOWED_ORIGINS` | `http://localhost` | Comma-separated allowed origins |
| `DB_PATH` | `/data/cloudcrypt.db` | SQLite database file path |
| `DATA_DIR` | `/data` | Base directory for file storage and avatars |

## CI/CD

Push to `main` triggers a GitHub Actions workflow that builds and publishes Docker images to GitHub Container Registry (`ghcr.io`).

To deploy, pull the latest images on your server:

```bash
docker compose pull
docker compose up -d
```

## Architecture

```
┌─────────────┐     ┌──────────────┐
│   Nginx     │────▶│  Go Backend  │
│  (Frontend) │     │  (API :8443) │
│   :80       │     └──────┬───────┘
└─────────────┘            │
                     ┌─────▼─────┐
                     │  /data    │
                     │  volume   │
                     └───────────┘
```

- **Frontend**: React + Vite, built and served by Nginx
- **Backend**: Go + Gin + SQLite, encrypted file storage
- **Nginx**: Serves static files + reverse proxies `/api/` to backend

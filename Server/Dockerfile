# ── Build stage ──
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o /build/cloudcrypt -ldflags="-s -w" .

# ── Run stage ──
FROM alpine:3.21

RUN apk add --no-cache ca-certificates

RUN adduser -D -u 1000 appuser

WORKDIR /app

COPY --from=builder /build/cloudcrypt /app/cloudcrypt

RUN mkdir -p /data/filestorage /data/avatars && chown -R appuser:appuser /data

USER appuser

EXPOSE 8443

ENV PORT=8443 \
    DATA_DIR=/data \
    DB_PATH=/data/cloudcrypt.db \
    FILE_MASTER_KEY="" \
    CORS_ALLOWED_ORIGINS=""

CMD ["/app/cloudcrypt"]

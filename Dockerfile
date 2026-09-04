# ============================================================
# FOX AI AGENCY — Production Dockerfile
# ============================================================
# Multi-stage build:
#   Stage 1: Builder — installs deps, lints, tests, builds
#   Stage 2: Runner — minimal runtime with non-root user
# ============================================================

# ---- Stage 1: Builder ----
FROM node:24-alpine AS builder

# Git is required only in this builder stage by the staging preflight fixture tests.
#
# openjdk21-jre-headless is required by the Firestore emulator (used by
# `npm run test:integration` in the verification gate below). It is
# installed in the BUILDER stage only — the runtime image (Stage 2) is
# intentionally not given Java or the emulator so the shipped container
# stays minimal and hardened.
#
# JAVA_HOME is exported so the integration-test runner script can locate
# the JRE without hardcoding a path. On Alpine 3.21+ the package installs
# at /usr/lib/jvm/java-21-openjdk.
RUN apk add --no-cache ca-certificates python3 git openjdk21-jre-headless
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk

WORKDIR /app

# Copy lock file and package.json for layer caching
COPY package.json package-lock.json ./

# Install dependencies (production + dev for build)
RUN npm ci --prefer-offline

# Copy source files
COPY . .

# Public Firebase Web config used by Vite at build time.
# These values are browser-visible by design. Never add server/private secrets here.
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

# Verify and build the application (client + server bundles).
#
# `npm run test:integration` runs the full test suite under a throwaway
# local Firestore emulator, so the integration tests (which need an
# authenticated Firebase Admin SDK) can pass without pointing at a
# real Firestore project. The script lives at
# `scripts/run-integration-tests.mjs` and is repo-owned.
RUN npm run lint && npm run test:integration && npm run build

# ---- Stage 2: Runtime ----
FROM node:24-alpine AS runtime

# Install ca-certificates for HTTPS
RUN apk add --no-cache ca-certificates && \
    addgroup -g 1001 -S foxapp && \
    adduser -u 1001 -S -G foxapp -h /home/foxapp -s /bin/sh foxapp

WORKDIR /app

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.package-lock.json ./node_modules/.package-lock.json

# Copy built artifacts only (esbuild bundles server.ts + all imports into dist/server.cjs)
COPY --from=builder /app/dist ./dist

# Set ownership to non-root user
RUN chown -R foxapp:foxapp /app

# Switch to non-root user
USER foxapp

# Expose the internal port (behind reverse proxy)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:3000/api/health',(res)=>{if(res.statusCode===200){process.exit(0)}else{process.exit(1)}}).on('error',()=>process.exit(1));setTimeout(()=>{process.exit(1)},4000);"

# Run as non-root, listen on all interfaces within container
# Nginx on the host will proxy to this port
ENV NODE_ENV=production
ENV FOX_LISTEN_HOST=0.0.0.0

CMD ["node", "dist/server.cjs"]

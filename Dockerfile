FROM node:22-alpine

WORKDIR /workspace

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV CHROME_PATH=/usr/bin/chromium-browser
ENV LIGHTHOUSE_CHROMIUM_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROMIUM_FLAGS="--headless --no-sandbox --disable-gpu --disable-dev-shm-usage"

COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/ai-providers/package.json packages/ai-providers/package.json
COPY packages/cms-adapters/package.json packages/cms-adapters/package.json

RUN npm install

COPY . .

CMD ["npm", "run", "dev"]

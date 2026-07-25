FROM node:22-alpine

WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/cms-adapters/package.json packages/cms-adapters/package.json

RUN npm install

COPY . .

CMD ["npm", "run", "dev"]

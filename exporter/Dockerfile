FROM node:22.14.0-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends fontconfig fonts-liberation fonts-noto-color-emoji && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY exporter ./exporter
COPY src/lib/simulation.js ./src/lib/simulation.js
COPY src/lib/pptxDiagram.js ./src/lib/pptxDiagram.js
COPY src/lib/subjectTheme.js ./src/lib/subjectTheme.js
USER node
EXPOSE 8082
CMD ["node", "exporter/index.mjs"]

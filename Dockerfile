FROM mcr.microsoft.com/playwright:v1.64.1-noble AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev


FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    xvfb x11vnc fluxbox novnc websockify tzdata \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    DISPLAY=:99 \
    PORT=3999 \
    TZ=America/Sao_Paulo

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3999 6080
VOLUME ["/app/data"]

ENTRYPOINT ["/entrypoint.sh"]

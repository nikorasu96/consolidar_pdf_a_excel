# ================================================================
# BASE PARA BUILD Y PRODUCCIÓN (más ligera)
# ================================================================
FROM node:20-alpine AS base-prod
ENV DIR=/app
WORKDIR $DIR
# Instalamos dumb-init para manejo correcto de señales y limpiamos cachés
RUN apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/* /usr/local/share/man /usr/local/share/doc /usr/local/share/gtk-doc

# ================================================================
# TARGET: Build
# ================================================================
FROM base-prod AS build
COPY package*.json $DIR/
RUN --mount=type=secret,id=npm_token \
    echo "//registry.npmjs.org/:_authToken=$(cat /run/secrets/npm_token)" > .npmrc && \
    npm ci && rm -f .npmrc && npm cache clean --force

# Copiamos archivos de configuración, código fuente y tipos.
COPY tsconfig*.json $DIR/
COPY types $DIR/types/          
COPY src $DIR/src/
COPY next.config.ts $DIR/

RUN npm run build && npm prune --production && \
    find node_modules -type f \( -name "*.md" -o -name "*.markdown" -o -name "*.map" \) -delete && \
    find node_modules -type d \( -name "test" -o -name "tests" -o -name "docs" \) -exec rm -rf {} + && \
    npx modclean --run


# ================================================================
# TARGET: Producción (sin git)
# ================================================================
FROM base-prod AS production
WORKDIR /app
# No instalamos git para mantener la imagen limpia.
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/.next /app/.next
COPY --from=build /app/next.config.ts /app/next.config.ts

ENV NODE_ENV=production
# Define la variable de entorno PORT; en este ejemplo, usaremos 3000.
EXPOSE ${PORT}

# Cambiamos al usuario "node" para mayor seguridad.
USER node

# Iniciamos la aplicación en modo producción.
CMD ["dumb-init", "node", "node_modules/next/dist/bin/next", "start"]

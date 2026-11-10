FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY cms/studio/package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node cms/studio/*.mjs ./
COPY --chown=node:node cms/studio/public ./public
COPY --chown=node:node public/assets ./public/assets
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]

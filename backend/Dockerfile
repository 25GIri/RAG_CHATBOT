FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY src ./src
RUN mkdir -p /app/storage && chown -R node:node /app
USER node
EXPOSE 5000
CMD ["node", "src/server.js"]

FROM node:18-alpine

WORKDIR /app

# Install Docker CLI for container management
RUN apk add --no-cache docker-cli

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]




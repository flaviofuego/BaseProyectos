FROM node:18-alpine

WORKDIR /app

# Create uploads directory
RUN mkdir -p /uploads

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3002

CMD ["node", "index.js"]

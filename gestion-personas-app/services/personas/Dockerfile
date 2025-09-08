FROM node:18-alpine

WORKDIR /app

# Create uploads directory with proper permissions
RUN mkdir -p /uploads && chmod 755 /uploads

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3002

CMD ["node", "index.js"]


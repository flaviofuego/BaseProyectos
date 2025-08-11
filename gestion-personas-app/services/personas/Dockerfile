FROM node:18-alpine

WORKDIR /app

# Create uploads directory
RUN mkdir -p /uploads

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3002

CMD ["node", "index.js"]


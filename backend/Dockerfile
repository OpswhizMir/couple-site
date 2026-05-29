FROM node:20-alpine

# better-sqlite3 needs build tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server.js ./

# Data and photo directories
RUN mkdir -p data ../frontend/photos

EXPOSE 3001

CMD ["node", "server.js"]

# Base Node Image
FROM node:20-alpine

# Set Working Directory
WORKDIR /app

# Copy package.json & package-lock.json
COPY package*.json ./

# Install Dependencies
RUN npm install

# Copy Server Source Code
COPY . .

# Expose Port 5000
EXPOSE 5000

# Start Express Server with nodemon / npm run dev
CMD ["npm", "run", "dev"]

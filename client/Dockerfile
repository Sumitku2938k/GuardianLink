# Base Node Image
FROM node:20-alpine

# Set Working Directory
WORKDIR /app

# Copy package.json & package-lock.json
COPY package*.json ./

# Install Dependencies
RUN npm install

# Copy Application Source Code
COPY . .

# Expose Port 3000
EXPOSE 3000

# Start Vite Development Server with host 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host"]

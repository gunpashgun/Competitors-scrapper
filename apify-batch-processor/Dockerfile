# Use official Apify Node.js image with Sharp support
FROM apify/actor-node:20

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --include=dev --audit=false

# Copy source code
COPY . ./

# Run the actor
CMD npm start


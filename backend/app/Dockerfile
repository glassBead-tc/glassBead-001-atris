# Use an official Node runtime as the parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /backend/app

# Install build dependencies and enable Corepack
RUN apk add --no-cache python3 make g++ gcc && \
    corepack enable

# Copy package.json and langgraph.json files
COPY package.json langgraph.json ./

# Install dependencies
RUN yarn install

# Copy the rest of the application code
COPY . .

# Build the application
RUN yarn build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["yarn", "start:dist"]

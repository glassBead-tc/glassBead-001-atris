#!/bin/bash

# Navigate to the backend directory
cd backend

# Install missing packages
echo "Installing missing packages..."
npm install @solana/wallet-adapter-base typed-emitter eventemitter3 dotenv winston

# Create type declaration files for missing types
echo "Creating type declaration files..."
cat <<EOL > globals.d.ts
declare module '@solana/wallet-adapter-base';
declare module 'typed-emitter';
declare module 'eventemitter3';
EOL

# Update existing packages
echo "Updating existing packages..."
npm update

# Check for outdated packages
echo "Checking for outdated packages..."
npm outdated

echo "All tasks completed. Please check for any remaining issues."
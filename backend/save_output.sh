#!/bin/bash

# Run the Node.js script and save its output to testoutput.txt
tsx src/index.ts > testoutput.txt 2>&1

echo "Output has been saved to testoutput.txt"
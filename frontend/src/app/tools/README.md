# Jupyter to Srcbook Converter

A tool for converting Jupyter notebooks (.ipynb) to Srcbook-compatible markdown files (.src.md), with a focus on LangGraph state management transformations.

## Overview

This tool helps convert Python-based Jupyter notebooks into TypeScript-compatible Srcbook format. It's particularly useful for converting LangGraph examples and tutorials from Python to TypeScript.

## Tools

### jupyter-to-srcbook.ts
The main conversion tool with comprehensive Python-to-TypeScript transformations, including:
- Type annotations
- CamelCase conversions
- Library mappings
- HTML-to-markdown transformations

### jupyter-to-srcbook-simple.ts
A simplified version focusing on basic conversions:
- Jupyter notebook to Srcbook format
- Code block language updates
- Basic markdown processing

## Usage

```bash
# Using the full version (with type transformations)
yarn tsx jupyter-to-srcbook.ts input.ipynb output.src.md

# Using the simplified version
yarn tsx jupyter-to-srcbook-simple.ts input.ipynb output.src.md
```

## Features

- Converts Python code to TypeScript
- Handles markdown and code cells
- Maintains code block formatting
- Generates appropriate package.json
- Preserves documentation and comments

## Development

The project is structured to allow both comprehensive and simple conversions:

1. Full Version (`jupyter-to-srcbook.ts`)
   - Complete Python-to-TypeScript transformations
   - Library mappings
   - Type safety improvements
   - Advanced markdown processing

2. Simple Version (`jupyter-to-srcbook-simple.ts`)
   - Basic notebook structure conversion
   - Minimal transformations
   - Focused on readability

## Contributing

Feel free to contribute improvements or report issues. Key areas for enhancement:
- Python-to-TypeScript transformations
- Library compatibility mappings
- Markdown formatting
- HTML processing

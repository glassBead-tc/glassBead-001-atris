import * as fs from 'fs/promises';

interface JupyterCell {
  cell_type: 'markdown' | 'code';
  source: string[];
}

interface JupyterNotebook {
  cells: JupyterCell[];
}

async function convertNotebook(inputPath: string, outputPath: string) {
  // Read and parse notebook
  const notebook = JSON.parse(await fs.readFile(inputPath, 'utf8')) as JupyterNotebook;
  
  // Start with Srcbook header
  let output = '<!-- srcbook:{"language":"typescript"} -->\n\n';
  
  // Add package.json with LangGraph dependency
  output += `###### package.json\n\n\`\`\`json
{
  "type": "module",
  "dependencies": {
    "@langchain/langgraph": "latest"
  }
}\n\`\`\`\n\n`;
  
  // Process cells
  for (const cell of notebook.cells) {
    if (cell.cell_type === 'markdown') {
      // For markdown: just join the lines
      output += cell.source.join('') + '\n\n';
    } else if (cell.cell_type === 'code') {
      const code = cell.source.join('');
      // Skip magic commands
      if (code.trim().startsWith('%') || code.trim().startsWith('!')) {
        continue;
      }
      // For code: wrap in TypeScript code block
      output += `\`\`\`typescript\n${code}\`\`\`\n\n`;
    }
  }
  
  // Write output
  await fs.writeFile(outputPath, output);
}

// Get file paths from command line
const [,, inputFile, outputFile] = process.argv;
if (!inputFile || !outputFile) {
  console.error('Usage: tsx jupyter-to-srcbook.ts <input.ipynb> <output.src.md>');
  process.exit(1);
}

convertNotebook(inputFile, outputFile).catch(console.error);

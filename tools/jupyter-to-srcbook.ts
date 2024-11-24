import * as fs from 'fs/promises';
import * as path from 'path';
import * as https from 'https';

interface JupyterCell {
  cell_type: 'markdown' | 'code';
  source: string[];
  metadata?: any;
}

interface JupyterNotebook {
  cells: JupyterCell[];
  metadata: {
    kernelspec: {
      language: string;
      name: string;
    };
    language_info: {
      name: string;
      version: string;
    };
  };
}

interface PackageInfo {
  name: string;
  version: string;
}

interface ImportMapping {
  package: string;
  importStyle?: 'default' | 'namespace' | 'destructure';
  additionalDeps?: string[];
  transformCode?: (code: string) => string;
}

class JupyterToSrcbook {
  private codeCounter = 1;
  private language: string;
  private dependencies: Set<string> = new Set();
  private localImports: Set<string> = new Set();

  /**
   * Helper function to transform various Python constructs to TypeScript equivalents
   */
  private transformers: {
    toCamelCase: (input: string) => string;
    pythonType: (type: string) => string;
  } = {
    /**
     * Transform snake_case to camelCase, handling special cases:
     * - Function names (e.g., call_graph -> callGraph)
     * - Variable names (e.g., my_var -> myVar)
     * - Graph operations (e.g., add_node -> addNode)
     * - State channels (e.g., my_key -> myKey)
     */
    toCamelCase: (input: string): string => {
      // Skip if already camelCase or special constant
      if (input === 'START' || input === 'END') return input;
      
      // Handle special prefixes (e.g., call_graph, add_node)
      const specialPrefixes: readonly string[] = ['call', 'add', 'my', 'parent', 'child', 'grandchild'] as const;
      for (const prefix of specialPrefixes) {
        if (input.startsWith(`${prefix}_`)) {
          const rest = input.slice(prefix.length + 1);
          return prefix + rest.split('_')
            .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
        }
      }
      
      // General camelCase transformation
      return input.split('_')
        .map((part: string, index: number) => 
          index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
    },

    /**
     * Transform Python types to TypeScript types
     */
    pythonType: (type: string): string => {
      const typeMap: Readonly<Record<string, string>> = {
        'str': 'string',
        'int': 'number',
        'float': 'number',
        'bool': 'boolean',
        'list': 'Array',
        'dict': 'Record',
        'None': 'null',
      } as const;
      return typeMap[type] || type;
    }
  };

  // Comprehensive mapping of Python packages to their JavaScript equivalents
  private readonly pythonToJsPackages: Record<string, ImportMapping> = {
    // Data Processing & Analysis
    'pandas': { 
      package: 'pandas-js',
      importStyle: 'namespace',
      additionalDeps: ['numjs']
    },
    'numpy': { 
      package: 'numjs',
      importStyle: 'namespace'
    },
    'scipy': { 
      package: 'science.js',
      importStyle: 'namespace'
    },
    
    // Machine Learning
    'sklearn': { 
      package: 'scikit-learn',
      additionalDeps: ['ml.js', '@tensorflow/tfjs']
    },
    'tensorflow': { 
      package: '@tensorflow/tfjs',
      importStyle: 'namespace'
    },
    'keras': { 
      package: '@tensorflow/tfjs-layers',
      importStyle: 'namespace'
    },
    
    // Visualization
    'matplotlib': { 
      package: 'plotly.js',
      importStyle: 'default',
      additionalDeps: ['chart.js']
    },
    'seaborn': { 
      package: 'chart.js',
      importStyle: 'default'
    },
    'plotly': { 
      package: 'plotly.js',
      importStyle: 'default'
    },
    
    // Data I/O
    'csv': { 
      package: 'csv-parse',
      additionalDeps: ['csv-stringify']
    },
    'json': { 
      package: 'json5',
      transformCode: (code) => code.replace(/json\./g, 'JSON.')
    },
    'requests': { 
      package: 'axios',
      importStyle: 'default'
    },
    
    // Text Processing
    'nltk': { 
      package: 'natural',
      importStyle: 'namespace'
    },
    're': { 
      package: 'regexp',
      transformCode: (code) => code.replace(/re\./g, '').replace(/pattern\s*=\s*r(['"])(.*?)\1/g, 'pattern = $1$2$1')
    },
    
    // Scientific Computing
    'sympy': { 
      package: 'mathjs',
      importStyle: 'namespace'
    },
    'math': { 
      package: 'math-extended',
      transformCode: (code) => code.replace(/math\./g, 'Math.')
    },
    
    // Image Processing
    'PIL': { 
      package: 'jimp',
      importStyle: 'default'
    },
    'opencv': { 
      package: 'opencv.js',
      importStyle: 'namespace'
    },
    
    // Utils
    'datetime': { 
      package: 'dayjs',
      importStyle: 'default',
      transformCode: (code) => code.replace(/datetime\./g, 'dayjs.')
    },
    'os': { 
      package: 'path',
      transformCode: (code) => code.replace(/os\.path/g, 'path')
    },
    'sys': { 
      package: 'process',
      transformCode: (code) => code.replace(/sys\.exit/g, 'process.exit')
    }
  };

  constructor(private notebook: JupyterNotebook) {
    this.language = this.determineLanguage();
  }

  private determineLanguage(): string {
    const lang = this.notebook.metadata?.kernelspec?.language || 
                this.notebook.metadata?.language_info?.name || 
                'javascript';
    
    // Map Python to JavaScript as Srcbook doesn't support Python
    return lang === 'python' ? 'javascript' : lang;
  }

  private generateCodeFilename(index: number): string {
    return `cell_${index}.${this.language === 'typescript' ? 'ts' : 'js'}`;
  }

  private processMarkdownCell(cell: JupyterCell): string {
    let content = cell.source.join('\n');

    // Transform admonitions to plain markdown
    content = content.replace(
      /<div[^>]*class="admonition[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      (_: string, innerHtml: string) => {
        // Extract title
        const titleMatch = innerHtml.match(/<p[^>]*class="admonition-title"[^>]*>(.*?)<\/p>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Note';

        // Extract and clean body
        let body = innerHtml
          // Remove the title paragraph
          .replace(/<p[^>]*class="admonition-title"[^>]*>.*?<\/p>/i, '')
          // Convert links to markdown
          .replace(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '[$2]($1)')
          // Remove style attributes
          .replace(/\s*style="[^"]*"/g, '')
          // Remove remaining HTML tags but keep content
          .replace(/<[^>]+>/g, '')
          .trim();

        // Format as plain markdown
        return `### ${title}\n\n${body}\n`;
      }
    );

    // Transform Python code blocks to TypeScript in markdown
    content = content.replace(
      /```python\n([\s\S]*?)```/g,
      (_: string, code: string) => {
        const transformedCode = this.transformPythonCode(code);
        return `\`\`\`typescript\n${transformedCode}\`\`\``;
      }
    );

    return content;
  }

  private processCodeCell(cell: JupyterCell, index: number): string {
    let code = cell.source.join('');
    
    // Skip transformation for magic commands and pip installs
    if (code.trim().startsWith('%') || code.trim().startsWith('!pip')) {
      // Convert pip install to npm install
      if (code.includes('pip install')) {
        const packages = code.match(/pip install\s+(.+)/)?.[1] || '';
        return `\`\`\`bash\nnpm install ${packages.replace('langgraph', '@langchain/langgraph')}\n\`\`\`\n`;
      }
      return '';
    }

    // Transform Python code to TypeScript
    const transformedCode = this.transformPythonCode(code);
    
    // Return code block with TypeScript language marker
    return `\`\`\`typescript\n${transformedCode}\n\`\`\`\n`;
  }

  private transformPythonImports(code: string): { code: string; imports: string[] } {
    const imports: string[] = [];
    let transformedCode = code;

    // Handle Python imports
    const importRegex = /^(?:from\s+([\w.]+)\s+)?import\s+([\w*,\s]+)(?:\s+as\s+[\w]+)?/gm;
    transformedCode = transformedCode.replace(importRegex, (match: string, fromPath?: string, importList?: string) => {
      if (!importList) return match;
      
      const items = importList.split(',').map(i => i.trim());
      const transformedImports: string[] = [];
      
      items.forEach(item => {
        const baseName = fromPath || item;
        const mapping = this.pythonToJsPackages[baseName];
        
        if (mapping) {
          // Add main package and any additional dependencies
          imports.push(mapping.package);
          if (mapping.additionalDeps) {
            imports.push(...mapping.additionalDeps);
          }

          // Transform the import statement based on style
          const importName = item === '*' ? baseName : item;
          switch (mapping.importStyle) {
            case 'default':
              transformedImports.push(`import ${importName} from '${mapping.package}'`);
              break;
            case 'namespace':
              transformedImports.push(`import * as ${importName} from '${mapping.package}'`);
              break;
            case 'destructure':
              transformedImports.push(`import { ${importName} } from '${mapping.package}'`);
              break;
            default:
              transformedImports.push(`import '${mapping.package}'`);
          }
        } else if (baseName.startsWith('.')) {
          // Handle local imports
          this.localImports.add(baseName);
          transformedImports.push(match);
        } else {
          transformedImports.push(match);
        }
      });
      
      return transformedImports.join('\n');
    });

    // Apply any additional code transformations
    Object.entries(this.pythonToJsPackages).forEach(([pyPkg, mapping]) => {
      if (mapping.transformCode && code.includes(pyPkg)) {
        transformedCode = mapping.transformCode(transformedCode);
      }
    });

    return { code: transformedCode, imports };
  }

  private extractImports(code: string): string[] {
    const imports: string[] = [];
    
    if (this.language === 'python') {
      const { imports: pyImports } = this.transformPythonImports(code);
      imports.push(...pyImports);
    } else {
      // Match ES6 imports
      const es6ImportRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([@\w-]+)[\w-./]*['"]/g;
      let match;
      while ((match = es6ImportRegex.exec(code)) !== null) {
        imports.push(match[1]);
      }
      
      // Match require statements
      const requireRegex = /require\s*\(['"]([@\w-]+)[\w-./]*['"]\)/g;
      while ((match = requireRegex.exec(code)) !== null) {
        imports.push(match[1]);
      }
    }
    
    // Filter out node built-ins
    const builtins = new Set(['fs', 'path', 'http', 'https', 'util', 'crypto', 'stream', 'zlib', 'events']);
    return imports.filter(imp => !builtins.has(imp));
  }

  private async getLatestVersion(packageName: string): Promise<string> {
    return new Promise((resolve) => {
      const url = `https://registry.npmjs.org/${packageName}/latest`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.version || 'latest');
          } catch (e) {
            resolve('latest'); // Fallback to 'latest' if we can't get the version
          }
        });
      }).on('error', () => resolve('latest'));
    });
  }

  private transformPythonCode(code: string): string {
    let transformedCode = code;

    // Transform imports
    transformedCode = transformedCode.replace(
      /from\s+typing_extensions\s+import\s+TypedDict\s*\n/g,
      'import { StateGraph, START, Annotation } from "@langchain/langgraph";\n'
    ).replace(
      /from\s+langgraph\.graph\.state\s+import\s+StateGraph,\s*START,\s*END\s*\n/g,
      '' // Already imported above
    );

    // Transform TypedDict classes to TypeScript interfaces
    transformedCode = transformedCode.replace(
      /class\s+(\w+)\(TypedDict\):\s*\n([\s\S]*?)(?=\n\S|$)/g,
      (match: string, name: string, body: string) => {
        const props = body.trim().split('\n').map((line: string) => {
          const [prop, type] = line.trim().split(':').map((s: string) => s.trim());
          return `    ${this.transformers.toCamelCase(prop)}: Annotation<${this.transformers.pythonType(type)}>,`;
        }).join('\n');
        return `const ${name}Annotation = Annotation.Root({\n${props}\n})`;
      }
    );

    // Transform function definitions
    transformedCode = transformedCode.replace(
      /def\s+(\w+(?:_\w+)*)\s*\(state:\s*(\w+)\)\s*->\s*(\w+):\s*\n([\s\S]*?)(?=\n\S|$)/g,
      (_: string, name: string, stateType: string, returnType: string, body: string) => {
        const funcName = this.transformers.toCamelCase(name);
        return `const ${funcName} = async (state: typeof ${stateType}Annotation.State) => {\n${this.transformFunctionBody(body)}\n}`;
      }
    );

    // Transform StateGraph instantiation and operations
    transformedCode = transformedCode
      // Transform StateGraph creation
      .replace(
        /(\w+)\s*=\s*StateGraph\((\w+)\)/g,
        'const $1 = new StateGraph($2Annotation)'
      )
      // Transform all graph operations to camelCase
      .replace(
        /(\w+)\.(add_node|add_edge)\(([^)]+)\)/g,
        (match: string, graph: string, method: string, args: string) => {
          const camelMethod = this.transformers.toCamelCase(method);
          // Split args and transform each argument
          const transformedArgs = args.split(',').map((arg: string) => {
            const trimmed = arg.trim();
            if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
              // Transform node names in quotes to camelCase
              return trimmed.replace(
                /["'](\w+(?:_\w+)*)["']/g,
                (_: string, name: string) => `"${this.transformers.toCamelCase(name)}"`);
            } else if (trimmed === 'START' || trimmed === 'END') {
              // Keep START and END constants as is
              return trimmed;
            } else {
              // Transform function references to camelCase
              return this.transformers.toCamelCase(trimmed);
            }
          }).join(', ');
          return `${graph}.${camelMethod}(${transformedArgs})`;
        }
      )

    // Transform Python comments to TypeScript comments
    transformedCode = transformedCode.replace(
      /#\s*(.*?)$/gm,
      (_: string, comment: string) => {
        // Transform specific terms in comments to camelCase
        const transformedComment = comment.replace(
          /\b((?:grand)?child|parent)?_?(graph|key|input|output)\b/g,
          (match: string) => this.transformers.toCamelCase(match)
        );
        return `// ${transformedComment}`;
      }
    );

    // Transform backtick references in comments
    transformedCode = transformedCode.replace(
      /\/\/\s*.*?`([^`]+)`/g,
      (match: string, backtickContent: string) => {
        // Transform snake_case to camelCase within backticks
        const transformedContent = backtickContent.replace(
          /(\w+)_(\w+)/g,
          (_: string, p1: string, p2: string) => this.transformers.toCamelCase(`${p1}_${p2}`)
        );
        return match.replace(backtickContent, transformedContent);
      }
    );

    // Transform comments
    transformedCode = transformedCode.replace(
      /\/\/\s*(.*?)$/gm,
      (_: string, comment: string) => {
        // Transform specific terms in comments to camelCase
        const transformedComment = comment.replace(
          /\b((?:grand)?child|parent)?_?(graph|key|input|output)\b/g,
          (match: string) => this.transformers.toCamelCase(match)
        );
        return `// ${transformedComment}`;
      }
    );

    // Transform dictionary keys to camelCase
    transformedCode = transformedCode.replace(
      /\{([^}]+)}/g,
      (match: string, content: string) => {
        if (match.includes('from') || match.includes('import')) return match;
        return '{' + content.replace(
          /["'](\w+(?:_\w+)*)["']\s*:/g,
          (_: string, key: string) => `${this.transformers.toCamelCase(key)}: `
        ) + '}';
      }
    );

    // Transform invoke parameters
    transformedCode = transformedCode.replace(
      /\.invoke\(\{["'](\w+(?:_\w+)*)["']:\s*([^}]+)\}\)/g,
      (_: string, key: string, value: string) => `.invoke({${this.transformers.toCamelCase(key)}: ${value.trim()}})`
    );

    return transformedCode;
  }

  private transformFunctionBody(body: string): string {
    let transformedBody = body;
    const indent = '  ';

    // Transform Python comments to TypeScript style
    transformedBody = transformedBody.replace(
      /#\s*(.*?)$/gm,
      (_: string, comment: string) => {
        // Transform specific terms in comments to camelCase
        const transformedComment = comment.replace(
          /\b((?:grand)?child|parent)?_?(graph|key|input|output)\b/g,
          (match: string) => this.transformers.toCamelCase(match)
        );
        return `// ${transformedComment}`;
      }
    );

    // Transform comments with backtick references
    transformedBody = transformedBody.replace(
      /\/\/\s*.*?`([^`]+)`/g,
      (match: string, backtickContent: string) => {
        // Transform snake_case to camelCase within backticks
        const transformedContent = backtickContent.replace(
          /(\w+)_(\w+)/g,
          (_: string, p1: string, p2: string) => this.transformers.toCamelCase(`${p1}_${p2}`)
        );
        return match.replace(backtickContent, transformedContent);
      }
    );

    // Transform regular comments with snake_case terms
    transformedBody = transformedBody.replace(
      /\/\/\s*(.*?)$/gm,
      (_: string, comment: string) => {
        // Transform specific terms in comments to camelCase
        const transformedComment = comment.replace(
          /\b((?:grand)?child|parent)?_?(graph|key|input|output)\b/g,
          (match: string) => this.transformers.toCamelCase(match)
        );
        return `// ${transformedComment}`;
      }
    );

    // Add const to variable declarations and transform variable names
    transformedBody = transformedBody.replace(
      /^(\s*)(\w+(?:_\w+)*)\s*=\s*/gm,
      (_: string, indent: string, varName: string) => `${indent}const ${this.transformers.toCamelCase(varName)} = `
    );

    // Transform dictionary access and references
    transformedBody = transformedBody.replace(
      /(\w+)\[["'](\w+)["']\]/g,
      (_: string, obj: string, key: string) => `${obj}.${this.transformers.toCamelCase(key)}`
    ).replace(
      /\b(\w+)_graph\b/g,
      (_: string, name: string) => `${this.transformers.toCamelCase(name)}Graph`
    ).replace(
      /\b(\w+)_output\b/g,
      (_: string, name: string) => `${this.transformers.toCamelCase(name)}Output`
    ).replace(
      /\b(\w+)_input\b/g,
      (_: string, name: string) => `${this.transformers.toCamelCase(name)}Input`
    );

    // Transform dictionary keys to camelCase
    transformedBody = transformedBody.replace(
      /{([^}]+)}/g,
      (match: string, content: string) => {
        if (match.includes('from') || match.includes('import')) return match;
        return '{' + content.replace(
          /["'](\w+(?:_\w+)*)["']\s*:/g,
          (_: string, key: string) => `${this.transformers.toCamelCase(key)}: `
        ) + '}';
      }
    );

    return transformedBody;
  }
}

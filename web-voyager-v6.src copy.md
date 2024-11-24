<!-- srcbook:{"language":"typescript","tsconfig.json":{"compilerOptions":{"target":"ES2018","module":"ESNext","moduleResolution":"node","esModuleInterop":true,"strict":true,"skipLibCheck":true,"forceConsistentCasingInFileNames":true,"outDir":"./dist","rootDir":"./src","types":["node"]},"include":["src/**/*"]}} -->

# Web Voyager with Anthropic

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "@langchain/anthropic": "^0.3.7",
    "@langchain/core": "^0.2.21",
    "langchain": "^0.1.0",
    "puppeteer-core": "^23.7.1"
  },
  "devDependencies": {
    "@types/node": "latest",
    "tsx": "latest",
    "typescript": "latest"
  },
  "scripts": {
    "start": "NODE_NO_WARNINGS=1 tsx src/example.ts"
  }
}

```

## Web Voyager Agent

This Srcbook implements a web browsing agent powered by Anthropic's Claude model. The agent can navigate web pages, interact with elements, and answer questions based on web content.

First, let's create some helper functions:

###### helpers.ts

```typescript
import { Page, JSHandle } from 'puppeteer-core';

export async function markPage(page: Page) {
  await page.evaluate(() => {
    const customCSS = `
      ::-webkit-scrollbar {
        width: 10px;
      }
      ::-webkit-scrollbar-track {
        background: #27272a;
      }
      ::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 0.375rem;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
    `;
    const styleTag = document.createElement("style");
    styleTag.textContent = customCSS;
    document.head.append(styleTag);
  });

  const coordinatesHandle: JSHandle = await page.evaluateHandle(() => {
    const labels: HTMLElement[] = [];
    const unmarkPage = () => {
      for (const label of labels) {
        document.body.removeChild(label);
      }
      labels.length = 0;
    };
    unmarkPage();
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const items = Array.from(document.querySelectorAll("*"))
      .map((element) => {
        const textualContent = element.textContent?.trim().replace(/\s{2,}/g, " ") || "";
        const elementType = element.tagName.toLowerCase();
        const ariaLabel = element.getAttribute("aria-label") || "";
        const rects = Array.from(element.getClientRects())
          .filter((bb) => {
            const center_x = bb.left + bb.width / 2;
            const center_y = bb.top + bb.height / 2;
            const elAtCenter = document.elementFromPoint(center_x, center_y);
            return elAtCenter === element || element.contains(elAtCenter);
          })
          .map((bb) => {
            const rect = {
              left: Math.max(0, bb.left),
              top: Math.max(0, bb.top),
              right: Math.min(vw, bb.right),
              bottom: Math.min(vh, bb.bottom),
            };
            return {
              ...rect,
              width: rect.right - rect.left,
              height: rect.bottom - rect.top,
            };
          });
        const area = rects.reduce((acc, rect) => acc + rect.width * rect.height, 0);
        return {
          element,
          include:
            element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            element.tagName === "SELECT" ||
            element.tagName === "BUTTON" ||
            element.tagName === "A" ||
            ('onclick' in element) ||
            window.getComputedStyle(element).cursor == "pointer" ||
            element.tagName === "IFRAME" ||
            element.tagName === "VIDEO",
          area,
          rects,
          text: textualContent,
          type: elementType,
          ariaLabel,
        };
      })
      .filter((item) => item.include && item.area >= 20);
    const filteredItems = items.filter(
      (x) => !items.some((y) => x.element.contains(y.element) && x !== y)
    );
    const getRandomColor = () => {
      const letters = "0123456789ABCDEF";
      let color = "#";
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    };
    filteredItems.forEach((item, index) => {
      item.rects.forEach((bbox) => {
        const newElement = document.createElement("div");
        const borderColor = getRandomColor();
        Object.assign(newElement.style, {
          outline: `2px dashed ${borderColor}`,
          position: "fixed",
          left: `${bbox.left}px`,
          top: `${bbox.top}px`,
          width: `${bbox.width}px`,
          height: `${bbox.height}px`,
          pointerEvents: "none",
          boxSizing: "border-box",
          zIndex: "2147483647",
        });
        const label = document.createElement("span");
        label.textContent = index.toString();
        Object.assign(label.style, {
          position: "absolute",
          top: "-19px",
          left: "0px",
          background: borderColor,
          color: "white",
          padding: "2px 4px",
          fontSize: "12px",
          borderRadius: "2px",
        });
        newElement.appendChild(label);
        document.body.appendChild(newElement);
        labels.push(newElement);
      });
    });
    return filteredItems.flatMap((item) =>
      item.rects.map(({ left, top, width, height }) => ({
        x: (left + left + width) / 2,
        y: (top + top + height) / 2,
        type: item.type,
        text: item.text,
        ariaLabel: item.ariaLabel,
      }))
    );
  });

  const coordinates = await coordinatesHandle.jsonValue();
  await coordinatesHandle.dispose();
  const screenshot = await page.screenshot({ encoding: 'base64' });
  return { coordinates, screenshot };
}

export function formatDescriptions(boxes: any[]): string {
  return boxes.map((box, i) =>
    `${i}: ${box.text} (${box.type}${box.ariaLabel ? ` - ${box.ariaLabel}` : ''})`
  ).join('\n');
}

export function updateScratchpad(current: string, action: string): string {
  return current ? `${current}\n${action}` : action;
}

export function parseAction(input: string) {
  const action = input.trim().split(';')[0].trim().toLowerCase();
  const args = input.includes(';') ? input.split(';').slice(1).join(';').trim() : '';
  return { action, args };
}
```

###### types.ts

```typescript
export interface BoundingBox {
  text: string;
  tag: string;
  attributes?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Now let's implement the core agent:

###### agent.ts

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { parseAction } from './helpers.js';

const llm = new ChatAnthropic({
  modelName: "claude-3-5-sonnet-20241022",
  maxTokens: 4096,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

const prompt = PromptTemplate.fromTemplate(`
You are an AI assistant tasked with browsing the web to answer questions. You have access to a web browser and can perform actions like clicking, typing, scrolling, and navigating.

Current webpage: {url}
User question: {question}

Bounding Boxes:
{bbox_descriptions}

Previous actions:
{scratchpad}

Respond with one of the following actions:
1. Click [box_number]
2. Type [box_number]; [text_to_type]
3. Scroll [WINDOW/box_number]; [UP/DOWN]
4. Wait
5. GoBack
6. Google
7. ANSWER; [your_answer_here]

Your response:
`);

export const agent = RunnableSequence.from([
  prompt,
  llm,
  new StringOutputParser(),
  parseAction,
]);
```

Let's create a simple browser controller to execute the agent's actions:

###### browser-controller.ts

```typescript
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { markPage } from './helpers.js';

export class BrowserController {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    });
    this.page = await this.browser!.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
  }

  async getBoundingBoxes() {
    if (!this.page) throw new Error('Browser not initialized');
    return await markPage(this.page);
  }

  async executeAction(action: string, args: string) {
    if (!this.page) throw new Error('Browser not initialized');
    switch(action) {
      case 'click':
        const [x, y] = args.split(',').map(Number);
        await this.page.mouse.click(x, y);
        break;
      case 'type':
        const [inputX, inputY, text] = args.split(',');
        await this.page.mouse.click(Number(inputX), Number(inputY));
        await this.page.keyboard.type(text);
        break;
      case 'scroll':
        const [scrollX, scrollY, direction] = args.split(',');
        await this.page.mouse.move(Number(scrollX), Number(scrollY));
        await this.page.mouse.wheel({ deltaY: direction === 'down' ? 100 : -100 });
        break;
      case 'wait':
        await new Promise(resolve => setTimeout(resolve, Number(args)));
        break;
      case 'goback':
        await this.page.goBack();
        break;
      case 'google':
        await this.page.goto('https://www.google.com');
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async getCurrentUrl() {
    if (!this.page) throw new Error('Browser not initialized');
    return this.page.url();
  }
}
```

Here's an example of how to use the agent:

###### example.ts

```typescript
import { agent } from './agent.js';
import { BrowserController } from './browser-controller.js';
import { formatDescriptions } from './helpers.js';

async function main() {
  const browser = new BrowserController();
  await browser.init();
  
  try {
    const { coordinates, screenshot } = await browser.getBoundingBoxes();
    const result = await agent.invoke({
      url: await browser.getCurrentUrl(),
      question: "What is the main heading on this page?",
      bbox_descriptions: formatDescriptions(coordinates as any[]),
      scratchpad: "",
      screenshot: screenshot
    });
    
    console.log("Agent response:", result);
    await browser.executeAction(result.action, result.args);
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
```

## Usage Notes

1. Make sure to set your `ANTHROPIC_API_KEY` in the environment variables
2. The agent can perform web navigation tasks through a series of atomic actions
3. The browser controller runs in non-headless mode so you can see the actions being performed
4. The agent uses claude-3-5-sonnet-20241022 for decision making and natural language understanding

This implementation provides a foundation for building more sophisticated web automation tools. You can extend it by:
- Adding more sophisticated action handling
- Implementing error recovery
- Adding memory of previous interactions
- Enhancing the prompt for better decision making

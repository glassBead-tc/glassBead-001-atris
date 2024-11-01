import { GraphState } from "../types.js";

interface StateTransition {
  node: string;
  inputState: Partial<GraphState>;
  outputState: Partial<GraphState>;
  timestamp: number;
  error?: Error;
}

export class GraphDebugger {
  private transitions: StateTransition[] = [];
  
  logTransition(
    node: string, 
    input: Partial<GraphState>, 
    output: Partial<GraphState>,
    error?: Error
  ) {
    this.transitions.push({
      node,
      inputState: input,
      outputState: output,
      timestamp: Date.now(),
      error
    });
  }

  getDiff(prev: Partial<GraphState>, next: Partial<GraphState>): Record<string, any> {
    const diff: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    
    for (const key of allKeys) {
      const prevVal = prev[key as keyof GraphState];
      const nextVal = next[key as keyof GraphState];
      
      if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
        diff[key] = {
          from: prevVal,
          to: nextVal
        };
      }
    }
    return diff;
  }

  printTransitionLog() {
    console.log("\n=== Graph State Transitions ===");
    this.transitions.forEach((t, i) => {
      console.log(`\nStep ${i + 1}: ${t.node}`);
      console.log("Changes:", this.getDiff(t.inputState, t.outputState));
      if (t.error) {
        console.log("Error:", t.error.message);
      }
    });
  }
} 
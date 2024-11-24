<!-- srcbook:{"language":"typescript"} -->


###### package.json

```json
{
  "type": "module",
  "dependencies": {}
}
```

# How to transform inputs and outputs of a subgraph

It's possible that your subgraph state is completely independent from the parent graph state, i.e. there are no overlapping channels (keys) between the two. For example, you might have a supervisor agent that needs to produce a report with a help of multiple ReAct agents. ReAct agent subgraphs might keep track of a list of messages whereas the supervisor only needs user input and final report in its state, and doesn't need to keep track of messages.

In such cases you need to transform the inputs to the subgraph before calling it and then transform its outputs before returning. This guide shows how to do that.

## Setup

First, let's install the required packages
```bash
npm install -U @langchain/langgraph
```

<div class="admonition tip">
    <p class="admonition-title">Set up <a href="https://smith.langchain.com">LangSmith</a> for LangGraph development</p>
    <p style="padding-top: 5px;">
        Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started <a href="https://docs.smith.langchain.com">here</a>. 
    </p>
</div>
## Define graph and subgraphs

Let's define 3 graphs:
- a parent graph
- a child subgraph that will be called by the parent graph
- a grandchild subgraph that will be called by the child graph
### Define grandchild
```typescript
import { StateGraph, START, Annotation } from "@langchain/langgraph";
const GrandChildStateAnnotation = Annotation.Root({
    myGrandchildKey: Annotation<string>,
})
const grandchild1 = async (state: typeof GrandChildStateAnnotation.State) => {
  // NOTE: child or parent keys will not be accessible here
  return {myGrandchildKey:  state.myGrandchildKey + ", how are you"}


}
const grandchild = new StateGraph(GrandChildStateAnnotation)
grandchild.addNode("grandchild1", grandchild_1)

grandchild.addEdge(START, "grandchild1")
grandchild.addEdge("grandchild1", END)

const grandchildGraph = await grandchild.compile()
```

```typescript
await grandchildGraph.invoke({myGrandchildKey:  "hi Bob"})
```

### Define child
```typescript
const ChildStateAnnotation = Annotation.Root({
    myChildKey: Annotation<string>,
})
const callGrandchildGraph = async (state: typeof ChildStateAnnotation.State) => {
  // NOTE: parent or grandchild keys won't be accessible here
  // we're transforming the state from the child state channels (`myChildKey`)
  // to the child state channels (`myGrandchildKey`)
  const grandchildGraphInput = {myGrandchildKey:  state.myChildKey}
  // we're transforming the state from the grandchild state channels (`myGrandchildKey`)
  // back to the child state channels (`myChildKey`)
  const grandchildGraphOutput = await grandchildGraph.invoke(grandchildGraphInput)
  return {myChildKey:  grandchildGraphOutput.myGrandchildKey + " today?"}


}
const child = new StateGraph(ChildStateAnnotation)
// NOTE: we're passing a function here instead of just compiled graph (`childGraph`)
child.addNode("child1", call_grandchildGraph)
child.addEdge(START, "child1")
child.addEdge("child1", END)
const childGraph = await child.compile()
```

```typescript
await childGraph.invoke({myChildKey:  "hi Bob"})
```

<div class="admonition info">
    <p class="admonition-title">Note</p>
    <p>
    We're wrapping the <code>grandchild_graph</code> invocation in a separate function (<code>call_grandchild_graph</code>) that transforms the input state before calling the grandchild graph and then transforms the output of grandchild graph back to child graph state. If you just pass <code>grandchild_graph</code> directly to <code>.add_node</code> without the transformations, LangGraph will raise an error as there are no shared state channels (keys) between child and grandchild states.
    </p>
</div>
Note that child and grandchild subgraphs have their own, **independent** state that is not shared with the parent graph.
### Define parent
```typescript
const ParentStateAnnotation = Annotation.Root({
    myKey: Annotation<string>,
})
const parent1 = async (state: typeof ParentStateAnnotation.State) => {
  // NOTE: child or grandchild keys won't be accessible here
  return {myKey:  "hi " + state.myKey}


}
const parent2 = async (state: typeof ParentStateAnnotation.State) => {
  return {myKey:  state.myKey + " bye!"}


}
const callChildGraph = async (state: typeof ParentStateAnnotation.State) => {
  // we're transforming the state from the parent state channels (`myKey`)
  // to the child state channels (`myChildKey`)
  const childGraphInput = {myChildKey:  state.myKey}
  // we're transforming the state from the child state channels (`myChildKey`)
  // back to the parent state channels (`myKey`)
  const childGraphOutput = await childGraph.invoke(childGraphInput)
  return {myKey:  childGraphOutput.myChildKey}


}
const parent = new StateGraph(ParentStateAnnotation)
parent.addNode("parent1", parent_1)
// NOTE: we're passing a function here instead of just a compiled graph (``childGraph``)
parent.addNode("child", call_childGraph)
parent.addNode("parent2", parent_2)

parent.addEdge(START, "parent1")
parent.addEdge("parent1", "child")
parent.addEdge("child", "parent2")
parent.addEdge("parent2", END)

const parentGraph = await parent.compile()
```

<div class="admonition info">
    <p class="admonition-title">Note</p>
    <p>
    We're wrapping the <code>child_graph</code> invocation in a separate function (<code>call_child_graph</code>) that transforms the input state before calling the child graph and then transforms the output of the child graph back to parent graph state. If you just pass <code>child_graph</code> directly to <code>.add_node</code> without the transformations, LangGraph will raise an error as there are no shared state channels (keys) between parent and child states.
    </p>
</div>

Let's run the parent graph and make sure it correctly calls both the child and grandchild subgraphs:
```typescript
await parentGraph.invoke({myKey:  "Bob"})
```

Perfect! The parent graph correctly calls both the child and grandchild subgraphs (which we know since the ", how are you" and "today?" are added to our original "my_key" state value).
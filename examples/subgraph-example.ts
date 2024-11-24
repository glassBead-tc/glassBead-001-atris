import { StateGraph, Annotation } from "@langchain/langgraph";

// GrandChild Graph
interface GrandChildState {
  my_grandchild_key: string;
}

const GrandChildStateAnnotation = Annotation.Root({
  my_grandchild_key: Annotation<string>(),
});

const grandchild_1 = async (state: GrandChildState): Promise<Partial<GrandChildState>> => {
  // NOTE: child or parent keys will not be accessible here
  return { my_grandchild_key: state.my_grandchild_key + ", how are you" };
};

const grandchild = new StateGraph(GrandChildStateAnnotation);
grandchild.addNode("grandchild_1", grandchild_1);

grandchild.addEdge("START", "grandchild_1");
grandchild.addEdge("grandchild_1", "END");

const grandchild_graph = grandchild.compile();

// Child Graph
interface ChildState {
  my_child_key: string;
}

const ChildStateAnnotation = Annotation.Root({
  my_child_key: Annotation<string>(),
});

const call_grandchild_graph = async (state: ChildState): Promise<Partial<ChildState>> => {
  // NOTE: parent or grandchild keys won't be accessible here
  // Transform state from child channels to grandchild channels
  const grandchild_graph_input = { my_grandchild_key: state.my_child_key };
  
  // Call grandchild graph and transform output back to child channels
  const grandchild_graph_output = await grandchild_graph.invoke(grandchild_graph_input);
  return { my_child_key: grandchild_graph_output.my_grandchild_key + " today?" };
};

const child = new StateGraph(ChildStateAnnotation);
child.addNode("child_1", call_grandchild_graph);
child.addEdge("START", "child_1");
child.addEdge("child_1", "END");

const child_graph = child.compile();

// Parent Graph
interface ParentState {
  my_key: string;
}

const ParentStateAnnotation = Annotation.Root({
  my_key: Annotation<string>(),
});

const parent_1 = async (state: ParentState): Promise<Partial<ParentState>> => {
  // NOTE: child or grandchild keys won't be accessible here
  return { my_key: "hi " + state.my_key };
};

const parent_2 = async (state: ParentState): Promise<Partial<ParentState>> => {
  return { my_key: state.my_key + " bye!" };
};

const call_child_graph = async (state: ParentState): Promise<Partial<ParentState>> => {
  // Transform state from parent channels to child channels
  const child_graph_input = { my_child_key: state.my_key };
  
  // Call child graph and transform output back to parent channels
  const child_graph_output = await child_graph.invoke(child_graph_input);
  return { my_key: child_graph_output.my_child_key };
};

const parent = new StateGraph(ParentStateAnnotation);
parent.addNode("parent_1", parent_1);
parent.addNode("child", call_child_graph);
parent.addNode("parent_2", parent_2);

parent.addEdge("START", "parent_1");
parent.addEdge("parent_1", "child");
parent.addEdge("child", "parent_2");
parent.addEdge("parent_2", "END");

const parent_graph = parent.compile();

// Example usage
async function runExample() {
  const result = await parent_graph.invoke({ my_key: "Bob" });
  console.log(result); // Should output: { my_key: "hi Bob, how are you today? bye!" }
}

runExample().catch(console.error);

## Schema Issues [02-Nov-2024 21:04]


### Overview


I have been working for several weeks on this project, and I've been facing persistent issues with getting the input/output schemas and their expectations aligned between the nodes in our graph and the tools they're calling. This has been a massive headache for (conservatively) over 250 hours of dev time, almost all of which has been spent either debugging the issue or writing new implementations of the entire project, which inevitably leads to the same issue I refactored the project to avoid.

Here, I am going piece by piece, line by line, in the code and in the terminal, until I get this fixed.

### First pass

Let's take a look at our first node's output:


=== Extract Category Tool Processing ===
Raw Input: {
  "query": "What are the top 10 trending tracks on Audius?"
}
Expected Schema: { type: 'object', properties: { query: { type: 'string' } } }
Query: What are the top 10 trending tracks on Audius?
Tool Output: {
  "queryType": "trending_tracks",
  "entityType": "track",
  "isEntityQuery": true,
  "complexity": "moderate",
  "categories": [
    "Get Trending Tracks"
  ]
}

Complexity is suboptimal (should be simple), but valid, and the other fields are fully correct. This is a valid output from our node based on the input. But look at this:


=== Stream Output ===

=== QueryType Channel Update ===
Old State: null
Next State: "trending_tracks"
Update Stack: Error
    at BinaryOperatorAggregate.value [as operator] (file:///Users/b.c.nims/just-glassBead-things/glassBead-002-karoshi/glassBead-001-atris/backend/dist/app/index.js:36:42)
    at BinaryOperatorAggregate.update (file:///Users/b.c.nims/just-glassBead-things/glassBead-002-karoshi/glassBead-001-atris/node_modules/@langchain/langgraph/dist/channels/binop.js:54:35)
    at _applyWrites (file:///Users/b.c.nims/just-glassBead-things/glassBead-002-karoshi/glassBead-001-atris/node_modules/@langchain/langgraph/dist/pregel/algo.js:169:46)
    at PregelLoop.tick (file:///Users/b.c.nims/just-glassBead-things/glassBead-002-karoshi/glassBead-001-atris/node_modules/@langchain/langgraph/dist/pregel/loop.js:434:44)
    at CompiledStateGraph._streamIterator (file:///Users/b.c.nims/just-glassBead-things/glassBead-002-karoshi/glassBead-001-atris/node_modules/@langchain/langgraph/dist/pregel/index.js:735:31)
    at async Object.pull (file:///Users/b.c.nims/just-glassBead-things/glassBead-002-karoshi/glassBead-001-atris/node_modules/@langchain/core/dist/utils/stream.js:100:41)

=== Categories Channel Update ===
Old: null
Next: [ 'Get Trending Tracks' ]
Result: [ 'Get Trending Tracks' ]

=== Complexity Channel Update ===
Old State: null
Next State: moderate
Result: moderate

=== IsEntityQuery Channel Update ===
Old State: null
Next State: true
Result: true

=== EntityType Channel Update ===
Old State: null
Next State: track
Result: track



We have errors at BinaryOperatorAggregate.value [as operator] and BinaryOperatorAggregate.update. This refers to the reducer function, which returns one of two responses: either there is an update and the reducer function returns the updated value, or there is not and it remains at its current value. We get the same error everywhere.


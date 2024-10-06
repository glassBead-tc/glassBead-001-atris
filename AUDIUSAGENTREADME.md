## Audius Research Agent (Atris, no UI)  

Workflow steps (using Brace Sproul's Langgraph.js Langtool demo as a point of reference):
Link: https://www.youtube.com/watch?v=xbZzJjBm6t4


1. User query (entry point)
   -  No UI: I will simulate the queries

2. Extract category, or more generally,context.
   -  The categories will be tied to what entity the user is asking about (playlists, tracks, artists, etc.)
   -  Easy categorization since the endpoints usually have the same name as the entity.
   -  There are rules to ordinary human language that tell us the object and subject of a sentence, and these could be used to decide what word in the query is the "main idea".

3. Get API's in category.
    - it makes more sense to me to use Sproul's methodology here and just make a Tavily web search one of the API's that the agent has to choose from instead of splitting the workflow off at the point of deciding whether to use the Audius API or a web search.

4. Select the most appropriate API.
   -  As an analogy to Sproul's implementation, we can think of "Track" endpoints or "Artist" endpoints like the "high level categories" in the Langtool demo that each contain a subset of related API's, which in our case are the Audius API's.
   -  On a technical level this could be very similar.

5. Extract API params from user query.
   -  Differentiate between required and optional params and map them.
   -  We could end up with none pretty easily if the input is nonsense. Might want a little front-end santization for user input to avoid starting the workflow if the input is clearly either accidental or completely irrelevant.

6. Verify all params present and valid.
   - I'll assume I'm implementing this but I reserve the right to not do that.

7. Human-in-the-loop: query user if params look good.
   - my use case for human-in-the-loop isn't that compelling early on, but once users are able to make more challenging analytical queries, it will be important for the agent to verify the factors its taking in before making the fetch request.
   - I'll again assume I'm implementing this, and again I will reserve the right to not do that immediately.

8. Rinse-repeat steps 6 and 7 as many times as needed.
   - see above 

9. Execute fetch request.
   - agent queries the correct endpoint with the correct params

10. Final API Result
   - Return the result to the user.
   - The agent may need to do some post-processing on the result before returning it to the user, either for accuracy or for standard NLP presentation. This could be simple or complex. A comparative calculation involving many users and their playlists measured against each other over time, for example, could be quite demanding, whereas returning "X track by Y artist has Z plays" is pretty straightforward.





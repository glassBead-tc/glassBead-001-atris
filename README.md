# Atris

Atris is a research agent for Audius designed to provide artists, labels, and technologists with insights into making things on the platform that people like.

## Functionality

Currently, Atris takes in a query, chooses an appropriate API endpoint, and then makes the request to the endpoint. It then takes the result and returns a response. This is the basic functionality that's currently implemented via test queries: I am updating this repo frequently as I add more functionality.

The UI for the chatbot will be implemented in Next.js.

- trimmed_corpus.json (dataset, a large collection of API's)
- langtool_diagram.png (diagram of the agent's logical and expected workflow)
- langtool.ts (interfaces for the data in trimmed_corpus.json)

These files are from the repo for Brace Sproul's LangGraph.js demo on YouTube for "Langtool," a
multi-tool agent that can intelligently choose which API's to choose for a given query. The
setup of his project is very similar to the initial one we will be using here. (thanks, Brace! )* 🫡

[Github repo for Brace's demo](https://github.com/bracesproul/langtool-template/tree/main)

[Link to YouTube lecture](https://www.youtube.com/watch?v=xbZzJjBm6t4)


## Running Atris

To run the project locally, follow these steps:

1. Clone the repository
2. From the audius-langtool directory, run yarn install.
3. From the command line, run cd backend && yarn start



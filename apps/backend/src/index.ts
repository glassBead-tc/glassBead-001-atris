import express, { Request, Response } from 'express';
import { Router } from 'express';
import { GraphState } from './app/types.js';
import { ChatOpenAI } from "@langchain/openai";
import { createGraph } from './app/index.js'; 
import { END } from "@langchain/langgraph";

const app = express();
const port = process.env.PORT || 3000;
const apiRouter = Router();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

interface AgentRequest {
  query: string;
}

interface AgentResponse {
  response: string;
  error?: string;
}

const agentHandler = async (req: Request<{}, {}, AgentRequest>, res: Response<AgentResponse>) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({
        error: 'Query must be a string',
        response: ''
      });
      return;
    }
    
    const app = createGraph();
    const stream = await app.stream({
      query,
      llm: new ChatOpenAI({
        modelName: 'gpt-4',
        temperature: 0.1,
      }),
      initialized: false
    });

    let finalState: GraphState = {} as GraphState;
    
    for await (const output of stream) {
      if (output !== END) {
        finalState = output;
      }
    }

    res.json({
      response: finalState.formattedResponse || JSON.stringify(finalState)
    });
    
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({
      error: 'Internal server error',
      response: ''
    });
  }
};

apiRouter.post('/agent', agentHandler);

app.use('/api', apiRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

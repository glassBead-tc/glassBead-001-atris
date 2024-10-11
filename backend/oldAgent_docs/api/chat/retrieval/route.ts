import { createAudiusVectorStore } from '@/app/lib/vectorstore/vectorstore';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { createClient } from '@supabase/supabase-js';
import { fetchAudiusData } from '@/app/lib/chat/audiusData';
import { performWebSearch } from '@/app/lib/chat/webSearch';

const MAX_CONTEXT_LENGTH = 4000;

export const runtime = 'nodejs';

const CONDENSE_TEMPLATE = `Given the following conversation about Audius music platform and a follow up question, rephrase the follow up question to be a standalone question about Audius.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;

const ANSWER_TEMPLATE = `You are an Audius AI assistant. Answer based on:
Context: {context}
Chat history: {chat_history}
Audius data: {audiusData}
Question: {question}

If Audius data is available, use it as the primary source for your answer. The Audius data may contain information about tracks, artists, or playlists. Incorporate this information into your response, providing details such as play counts, follower counts, or track counts as appropriate.

For questions about specific tracks, always include the play count if it's available in the Audius data. For artists, include follower count and track count if available.

Answer concisely and directly. If you don't have the exact information, say so.`;

const combineDocumentsFn = (docs: any) => {
  return docs.map((doc: any) => doc.pageContent).join('\n\n');
};

export async function POST(req: Request) {
  if (!process.env.PUBLIC_SUPABASE_URL || !process.env.SUPABASE_PRIVATE_KEY) {
    throw new Error("Missing Supabase environment variables");
  }

  const body = await req.json();
  const messages = body.messages ?? [];
  const question = messages[messages.length - 1].content;
  const history = messages.slice(0, -1);

  const supabaseClient = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_PRIVATE_KEY
  );

  const vectorStore = await createAudiusVectorStore(supabaseClient);

  const embeddings = new OpenAIEmbeddings();

  const relevantDocs = await vectorStore.similaritySearch(question, 2);

  let context = combineDocumentsFn(relevantDocs).slice(0, MAX_CONTEXT_LENGTH);

  const llm = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    temperature: 0,
  });

  const determineQuestionType = async (question: string): Promise<'general' | 'specific'> => {
    const response = await llm.invoke([
      { role: "system", content: "You are a helpful assistant that determines question types." },
      { role: "user", content: `Determine if this is a general question about Audius or specific about tracks, users, or playlists. Answer "general" or "specific": ${question}` }
    ]);

    if (typeof response.content === 'string') {
      return response.content.trim().toLowerCase() as 'general' | 'specific';
    } else if (Array.isArray(response.content)) {
      const textContent = response.content.find(item => 'text' in item);
      if (textContent && 'text' in textContent) {
        return textContent.text.trim().toLowerCase() as 'general' | 'specific';
      }
    }
    throw new Error('Unexpected response format from LLM');
  };

  const questionType = await determineQuestionType(question);

  const standaloneQuestionChain = RunnableSequence.from([
    PromptTemplate.fromTemplate(CONDENSE_TEMPLATE),
    llm,
    new StringOutputParser(),
  ]);

  const standaloneQuestion = await standaloneQuestionChain.invoke({
    question,
    chat_history: history.map((m: any) => m.content).join('\n'),
  });

  const audiusData = await fetchAudiusData(standaloneQuestion);
  let audiusInfo = audiusData ? formatAudiusData(audiusData) : "No specific Audius information found.";

  if (questionType === 'general') {
    const webSearchResults = await performWebSearch(question);
    context = `${context}\n\nWeb search results: ${webSearchResults}`.slice(0, MAX_CONTEXT_LENGTH);
  }

  const answerChain = RunnableSequence.from([
    PromptTemplate.fromTemplate(ANSWER_TEMPLATE),
    llm,
    new StringOutputParser(),
  ]);

  const stream = await answerChain.stream({
    context,
    question: standaloneQuestion,
    chat_history: history.map((m: any) => m.content).join('\n').slice(-500),
    audiusData: audiusInfo,
  });

  const { readable, writable } = new TransformStream();
  stream.pipeTo(writable);

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function formatAudiusData(audiusData: any): string {
  switch (audiusData.type) {
    case 'track':
      return `Track: "${audiusData.data.title}" by ${audiusData.data.user.name} (@${audiusData.data.user.handle})
      Plays: ${audiusData.data.playCount}
      Duration: ${audiusData.data.duration} seconds
      Genre: ${audiusData.data.genre}
      Mood: ${audiusData.data.mood || 'Not specified'}
      Release Date: ${audiusData.data.releaseDate || 'Not specified'}`;
    case 'artist':
      return `Artist: ${audiusData.data.name}
      Handle: @${audiusData.data.handle}
      Followers: ${audiusData.data.followerCount}
      Tracks: ${audiusData.data.trackCount}`;
    case 'playlist':
      return `Playlist: "${audiusData.data.playlistName}"
      Creator: ${audiusData.data.user}
      Tracks: ${audiusData.data.trackCount}`;
    case 'popularTrack':
      return `The ${audiusData.data.rank}${getRankSuffix(audiusData.data.rank)} most popular track by ${audiusData.data.artist} on Audius is "${audiusData.data.title}" with ${audiusData.data.playCount} plays.
      Genre: ${audiusData.data.genre}
      Mood: ${audiusData.data.mood || 'Not specified'}
      Release Date: ${audiusData.data.releaseDate || 'Not specified'}`;
    case 'noMatch':
      let info = `No exact match found for "${audiusData.data.searchedTrack}" by ${audiusData.data.searchedArtist}. Here are some similar tracks:\n`;
      audiusData.data.availableTracks.forEach((track: any, index: number) => {
        info += `${index + 1}. "${track.title}" by ${track.artist} (${track.playCount} plays)\n`;
      });
      return info;
    case 'remix':
      return `Remix: "${audiusData.data.title}" by ${audiusData.data.artist}
      Original Track: "${audiusData.data.remixOf.title}" by ${audiusData.data.remixOf.user}
      Plays: ${audiusData.data.remixOf.playCount}`;
    case 'genre':
      return `Genre: ${audiusData.data.genre}
      Popular Artists: ${audiusData.data.tracks.map((track: any) => track.artist).join(', ')}
      Popular Tracks: ${audiusData.data.tracks.map((track: any) => track.title).join(', ')}`;
    default:
      return "Unrecognized Audius data format.";
  }
}

function getRankSuffix(rank: number): string {
  if (rank % 10 === 1 && rank % 100 !== 11) {
    return 'st';
  } else if (rank % 10 === 2 && rank % 100 !== 12) {
    return 'nd';
  } else if (rank % 10 === 3 && rank % 100 !== 13) {
    return 'rd';
  } else {
    return 'th';
  }
}
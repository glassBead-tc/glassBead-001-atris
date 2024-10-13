import React, { createContext, useReducer, ReactNode, Dispatch } from 'react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

type State = {
  messages: Message[];
};

type Action =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'RESET_MESSAGES' };

const initialState: State = {
  messages: [],
};

const ChatContext = createContext<{ state: State; dispatch: Dispatch<Action> }>({
  state: initialState,
  dispatch: () => null,
});

const chatReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { messages: [...state.messages, action.payload] };
    case 'RESET_MESSAGES':
      return { messages: [] };
    default:
      return state;
  }
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  return <ChatContext.Provider value={{ state, dispatch }}>{children}</ChatContext.Provider>;
};

export default ChatContext;

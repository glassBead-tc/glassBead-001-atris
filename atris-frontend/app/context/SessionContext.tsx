import React, { createContext, useReducer, ReactNode, Dispatch } from 'react';

interface Session {
  userId?: string;
  queries: string[];
}

type State = {
  session: Session;
};

type Action =
  | { type: 'SET_USER'; payload: string }
  | { type: 'ADD_QUERY'; payload: string }
  | { type: 'RESET_SESSION' };

const initialState: State = {
  session: {
    queries: [],
  },
};

const SessionContext = createContext<{ state: State; dispatch: Dispatch<Action> }>({
  state: initialState,
  dispatch: () => null,
});

const sessionReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_USER':
      return { session: { ...state.session, userId: action.payload } };
    case 'ADD_QUERY':
      return { session: { ...state.session, queries: [...state.session.queries, action.payload] } };
    case 'RESET_SESSION':
      return { session: { queries: [] } };
    default:
      return state;
  }
};

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  return <SessionContext.Provider value={{ state, dispatch }}>{children}</SessionContext.Provider>;
};

export default SessionContext;

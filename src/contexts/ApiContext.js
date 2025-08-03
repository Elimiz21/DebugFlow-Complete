import { createContext } from 'react';

export const ApiContext = createContext({
  api: null,
  user: null,
  setUser: () => {}
});

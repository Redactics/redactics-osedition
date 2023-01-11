import React from 'react';

import { ContextObj } from '../types/redactics';

const contextObj:ContextObj = {
  apiUrl: '',
  wsUrl: '',
};
const RedacticsContext = React.createContext(contextObj);
export default RedacticsContext;

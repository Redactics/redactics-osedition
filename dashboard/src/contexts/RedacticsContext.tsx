import React from 'react';

import { ContextObj } from '../types/redactics';

const contextObj:ContextObj = {
  apiUrl: '',
  cliUrl: '',
  cliVersion: '',
};
const RedacticsContext = React.createContext(contextObj);
export default RedacticsContext;

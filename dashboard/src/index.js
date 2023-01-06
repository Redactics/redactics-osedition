import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import App from './App';

import store from './redux/store/index';

ReactDOM.render(<Provider store={store}>
    <App />
  </Provider>, document.getElementById('root'));

import * as types from '../constants';

/* eslint-disable @typescript-eslint/default-param-last */

export default function reducer(state = { currentTheme: 0 }, actions) {
  switch (actions.type) {
    case types.SET_THEME:
      return {
        ...state,
        currentTheme: actions.payload,
      };

    default:
      return state;
  }
}

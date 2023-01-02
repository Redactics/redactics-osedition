import React from 'react';
import { connect } from 'react-redux';

import Helmet from 'react-helmet';

import DateFnsUtils from '@date-io/date-fns';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core/styles';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import { StylesProvider } from '@material-ui/styles';
import { ThemeProvider } from 'styled-components';

import Routes from './routes/Routes';
import maTheme from './theme';

/* eslint-disable no-undef */
/* eslint-disable react/prop-types */

function App({ theme }) {
  return (
    <React.Fragment>
      <Helmet
        titleTemplate="%s | Redactics"
        defaultTitle="Redactics"
      />
      <StylesProvider injectFirst>
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <MuiThemeProvider theme={maTheme[theme.currentTheme]}>
            <ThemeProvider theme={maTheme[theme.currentTheme]}>
              <Routes />
            </ThemeProvider>
          </MuiThemeProvider>
        </MuiPickersUtilsProvider>
      </StylesProvider>
    </React.Fragment>
  );
}

export default connect((store) => ({ theme: store.themeReducer }))(App);

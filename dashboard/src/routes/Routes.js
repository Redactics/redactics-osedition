import React from 'react';
import {
  BrowserRouter as Router, Route, Switch,
} from 'react-router-dom';
import { dashboard as dashboardRoutes } from './index';

import async from '../components/Async';

import DashboardLayout from '../layouts/Dashboard';
import AuthLayout from '../layouts/Auth';
import RedacticsRoute from './RedacticsRoute';
//import ProtectedRoute from './ProtectedRoute';
const Page404 = async(() => import('../pages/Page404'));
// const Page500 = async(() => import('../pages/Page500'));

/* eslint-disable max-len */

const childRoutes = (Layout, routes) => routes.map(({ children, path, component: Component }, index) => (children ? (
  // Route item with children
  children.map(({ path, component: Component }, index) => (
    <RedacticsRoute exact={true} key={index} path={path} layout={Layout} component={Component} />
  ))
) : (
  // Route item without children
  <RedacticsRoute exact={true} key={index} path={path} layout={Layout} component={Component} />
)));

const Routes = () => (
  <Router>
    <Switch>
      {childRoutes(DashboardLayout, dashboardRoutes)}
      <Route
        render={() => (
          <AuthLayout>
            <Page404 />
          </AuthLayout>
        )}
      />
    </Switch>
  </Router>
);

export default Routes;

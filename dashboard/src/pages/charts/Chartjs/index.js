import React from 'react';
import styled from 'styled-components';
import { NavLink as RouterNavLink } from 'react-router-dom';

import Helmet from 'react-helmet';

import {
  Grid,
  Link,
  Breadcrumbs as MuiBreadcrumbs,
  Divider as MuiDivider,
  Typography,
} from '@material-ui/core';
import { spacing } from '@material-ui/system';

import LineChart from './LineChart';
import BarChart from './BarChart';
import DoughnutChart from './DoughnutChart';
import PieChart from './PieChart';
import RadarChart from './RadarChart';
import PolarChart from './PolarChart';

const Divider = styled(MuiDivider)(spacing);

const Breadcrumbs = styled(MuiBreadcrumbs)(spacing);

/* eslint-disable react/display-name */

const NavLink = React.forwardRef((props, ref) => (
  <RouterNavLink innerRef={ref} {...props} />
));

function Blank() {
  return (
    <React.Fragment>
      <Helmet title="Charts" />
      <Typography variant="h3" gutterBottom display="inline">
        Charts
      </Typography>

      <Breadcrumbs aria-label="Breadcrumb" mt={2}>
        <Link component={NavLink} exact to="/">
          Dashboard
        </Link>
        <Typography>Charts</Typography>
      </Breadcrumbs>

      <Divider my={6} />

      <Grid container spacing={6}>
        <Grid item xs={12} md={6}>
          <LineChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <BarChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <DoughnutChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <PieChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <RadarChart />
        </Grid>
        <Grid item xs={12} md={6}>
          <PolarChart />
        </Grid>
      </Grid>
    </React.Fragment>
  );
}

export default Blank;

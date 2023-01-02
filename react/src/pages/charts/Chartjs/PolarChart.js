import React from 'react';
import styled, { withTheme } from 'styled-components';

import { CardContent, Card as MuiCard, Typography } from '@material-ui/core';
import orange from '@material-ui/core/colors/orange';
import red from '@material-ui/core/colors/red';
import yellow from '@material-ui/core/colors/yellow';
import { spacing } from '@material-ui/system';

import { Polar } from 'react-chartjs-2';

const Card = styled(MuiCard)(spacing);

const Spacer = styled.div(spacing);

const ChartWrapper = styled.div`
  height: 300px;
`;

/* eslint-disable react/prop-types */

function PolarChart({ theme }) {
  const data = {
    labels: ['Speed', 'Reliability', 'Comfort', 'Safety', 'Efficiency'],
    datasets: [
      {
        label: 'Model S',
        data: [35, 38, 65, 70, 24],
        backgroundColor: [
          theme.palette.secondary.main,
          yellow[700],
          orange[500],
          red[500],
          theme.palette.grey[300],
        ],
      },
    ],
  };

  const options = { maintainAspectRatio: false };

  return (
    <Card mb={1}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Polar Area Chart
        </Typography>
        <Typography variant="body2" gutterBottom>
          Polar area charts are similar to pie charts, but each segment has the
          same angle.
        </Typography>

        <Spacer mb={6} />

        <ChartWrapper>
          <Polar data={data} options={options} />
        </ChartWrapper>
      </CardContent>
    </Card>
  );
}

export default withTheme(PolarChart);

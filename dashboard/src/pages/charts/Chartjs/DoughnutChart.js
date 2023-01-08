import React from 'react';
import styled, { withTheme } from 'styled-components';

import { CardContent, Card as MuiCard, Typography } from '@material-ui/core';
import orange from '@material-ui/core/colors/orange';
import red from '@material-ui/core/colors/red';
import { spacing } from '@material-ui/system';

import { Doughnut } from 'react-chartjs-2';

const Card = styled(MuiCard)(spacing);

const Spacer = styled.div(spacing);

const ChartWrapper = styled.div`
  height: 300px;
`;

/* eslint-disable react/prop-types */

function DoughnutChart({ theme }) {
  const data = {
    labels: ['Social', 'Search Engines', 'Direct', 'Other'],
    datasets: [
      {
        data: [260, 125, 54, 146],
        backgroundColor: [
          theme.palette.secondary.main,
          orange[500],
          red[500],
          theme.palette.grey[300],
        ],
        borderColor: 'transparent',
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    cutoutPercentage: 65,
    legend: {
      display: false,
    },
  };

  return (
    <Card mb={1}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Doughnut Chart
        </Typography>
        <Typography variant="body2" gutterBottom>
          Doughnut charts are excellent at showing the relational proportions
          between data.
        </Typography>

        <Spacer mb={6} />

        <ChartWrapper>
          <Doughnut data={data} options={options} />
        </ChartWrapper>
      </CardContent>
    </Card>
  );
}

export default withTheme(DoughnutChart);

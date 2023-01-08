import React from 'react';
import styled from 'styled-components';

import { spacing } from '@material-ui/system';
import { blue } from '@material-ui/core/colors';

import {
  Typography,
  TextField as MuiTextField,
  Select as MuiSelect,
  FormControl as MuiFormControl,
  InputLabel,
  MenuItem,
  Box,
  Link,
  FormControlLabel,
  Radio,
  RadioGroup,
  Tooltip,
  InputAdornment,
} from '@material-ui/core';

import {
  HelpOutline as HelpIcon,
  Info as InfoIcon,
} from '@material-ui/icons';

const TextFieldSpacing = styled(MuiTextField)(spacing);

const FormControlSpacing = styled(MuiFormControl)(spacing);

const FormControl = styled(FormControlSpacing)`
  min-width: 200px;
  max-width: 200px;
`;

const TextField = styled(TextFieldSpacing)`
  width: 200px;
`;

const Select = styled(MuiSelect)(spacing);

/* eslint-disable @typescript-eslint/no-empty-interface */

interface IProps {
  handleExportSchedule: any;
  exportSchedule: boolean;
  schedule: string;
  handleSchedule: any;
  scheduleSelection: string;
  customSchedule: boolean;
  workflowType: string;
  errors: any;
}

interface IState {

}

class DatabaseSchedule extends React.Component<IProps, IState> {
  render() {
    return (
      <React.Fragment>
        <Box mt={8}>
          <Typography variant="h4" gutterBottom>
            Workflow Schedule Options
          </Typography>

          <Box mt={4}>
            <RadioGroup aria-label="exportSchedule" name="exportSchedule" onChange={this.props.handleExportSchedule} value={String(this.props.exportSchedule)}>
              <FormControlLabel value="false" control={<Radio />} label="Do Not Automate Workflow" />
              <FormControlLabel value="true" control={<Radio />} label="Schedule/Automate Workflow" />
            </RadioGroup>
          </Box>

          <Box mt={2} display={(this.props.exportSchedule === true) ? 'block' : 'none'}>
            <Box>
              <FormControl fullWidth>
                <InputLabel htmlFor="scheduleSelection">Schedule</InputLabel>
                <Select
                  name="scheduleSelection"
                  onChange={this.props.handleSchedule}
                  value={this.props.scheduleSelection}
                >
                  <MenuItem key="none" value="None">None</MenuItem>
                  <MenuItem key="hourly" value="@hourly">Hourly</MenuItem>
                  <MenuItem key="daily" value="@daily">Daily</MenuItem>
                  <MenuItem key="weekly" value="@weekly">Weekly</MenuItem>
                  <MenuItem key="monthly" value="@monthly">Monthly</MenuItem>
                  <MenuItem key="custom" value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box mt={4} display={(this.props.customSchedule === true) ? 'block' : 'none'}>
              <FormControl fullWidth>
                <TextField
                  error={this.props.errors.schedule}
                  name="schedule"
                  label="Cronjob Schedule"
                  value={this.props.schedule}
                  onChange={this.props.handleSchedule}
                  InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Schedule time as a cron expression" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                />
                <Box mt={1}>
                  See <Link target="_blank" rel="noreferrer" href="https://crontab.guru"><b>Crontab Guru</b></Link> for help with generating cron schedule expressions.
                </Box>
              </FormControl>
            </Box>
          </Box>
        </Box>
      </React.Fragment>
    );
  }
}

export default DatabaseSchedule;

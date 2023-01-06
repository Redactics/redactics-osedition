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
  Checkbox,
  Tooltip,
  Grid,
} from '@material-ui/core';

import {
  HelpOutline as HelpIcon,
  Info as InfoIcon,
} from '@material-ui/icons';

import { RedactRule } from '../../types/redactics';

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
  generateSoftDeleteQueries: boolean;
  handleSoftDeletionFields: any;
  handleSoftDeleteEmailAddressField: any;
  maskingRuleValues: RedactRule[];
  userSearchEmailField: string;
  userSearchEmailDBTable: string;
  userSearchEmailColumn: string;
  allDatabaseTables: string[];
  workflowType: string;
}
interface IState {}

class DatabaseCompliance extends React.Component<IProps, IState> {
  /* eslint-disable max-len */

  render() {
    return (
      <React.Fragment>
        <Grid container>
          <Grid item xs={8}>
            <Box mt={6}>
              <Typography variant="h4" gutterBottom>
                Forget User Request Settings  
              </Typography>
              <Box mt={2}>
                <Typography variant="body1" gutterBottom>
                  Using the <Link href="/developers" target="_blank">Redactics Agent CLI</Link> you can search for specific users (using their email address) and generate SQL queries for soft deletion (removing PII using the rules defined by this workflow). Click <Link href='/usecases/forgetuser'>here</Link> for more information about how these features work.
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={this.props.generateSoftDeleteQueries}
                    disabled={!(this.props.workflowType === "ERL")}
                    onChange={(event) => this.props.handleSoftDeletionFields(event)}
                    name="generateSoftDeleteQueries"
                    color="primary"
                  />
                }
                label="Enable forget user request settings"
              /> <Tooltip title="Use the Redactics Agent CLI to generate SQL queries to carry out user requests to be forgotten" placement="right-start"><HelpIcon /></Tooltip>
            </Box>

            <Box mt={4} display={(this.props.generateSoftDeleteQueries === true) ? 'block' : 'none'}>

              <Box mt={8}>
                <Typography variant="h6" gutterBottom>
                  Email Address Field
                </Typography>

                <Typography variant="body1" gutterBottom>
                  Select the table and field where your user&apos;s email address resides from your listing of fields containing PII (above). This will be used by the Redactics Agent CLI to search for email addresses you provide and to generate soft delete and PII redaction SQL queries for this user.
                </Typography>

                <Box mt={4}>
                  <FormControl variant="outlined" margin="dense">
                    <InputLabel>
                      Database and Table Name
                    </InputLabel>
                    <Select
                      value={this.props.userSearchEmailDBTable}
                      name="userSearchEmailDBTable"
                      onChange={(event) => this.props.handleSoftDeleteEmailAddressField(event)}
                    >
                      {this.props.allDatabaseTables.map((dt:string) => (
                        <MenuItem key={dt} value={dt}>{dt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box mt={2}>
                  <FormControl variant="outlined" margin="dense">
                    <TextField 
                      name="userSearchEmailColumn"
                      defaultValue={this.props.userSearchEmailColumn}
                      label="Email Field"
                      variant="outlined"
                      onChange={(event) => this.props.handleSoftDeleteEmailAddressField(event)} margin="dense" 
                    />
                  </FormControl>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </React.Fragment>
    );
  }
}

export default DatabaseCompliance;

import React from 'react';
import styled from 'styled-components';

import { spacing } from '@material-ui/system';

import {
  Grid as MuiGrid,
  Typography,
  TextField as MuiTextField,
  Select as MuiSelect,
  FormControl as MuiFormControl,
  Button as MuiButton,
  InputLabel,
  OutlinedInput,
  MenuItem,
  Box,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@material-ui/core';

import {
  DeleteOutline as DeleteIcon,
  Add as AddIcon,
} from '@material-ui/icons';

import { RedactRule, WorkflowRecord } from '../../types/redactics';

const Grid = styled(MuiGrid)(spacing);

const TextFieldSpacing = styled(MuiTextField)(spacing);

const FormControlSpacing = styled(MuiFormControl)(spacing);

const FormControl = styled(FormControlSpacing)`
  min-width: 100px;
  max-width: 100px;
`;

const TextField = styled(TextFieldSpacing)`
  width: 100px;
`;

const Select = styled(MuiSelect)(spacing);

const Button = styled(MuiButton)(spacing);

interface IProps {
  workflow: WorkflowRecord;
  maskingRuleValues: RedactRule[];
  handleRuleChange: any;
  deleteMaskingRule: any;
  numMaskingRules: number;
  maskingRules: RedactRule[];
  addMaskingRule: any;
  allDatabaseTables: string[];
}

interface IState {
  ruleLabelWidth: number;
}

class WorkflowPostExport extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      ruleLabelWidth: 30,
    };
  }

  displayMaskingRules() {
    if (!this.props.numMaskingRules) {
      return (
        <Box>
          <Button variant="contained" color="secondary" size="small" onClick={this.props.addMaskingRule}>
            <AddIcon />&nbsp;&nbsp;Add Table Field Containing PII
          </Button>
        </Box>
      )
    }
    else {
      return (
        <Box mt={8}>
          <Grid
            justify="space-between"
            container
            spacing={10}
          >
            <Grid item></Grid>
            <Grid item mb={6}>
              <div>
                <Button variant="contained" color="secondary" size="small" onClick={this.props.addMaskingRule}>
                  <AddIcon />&nbsp;
                  Add Rule
                </Button>
              </div>
            </Grid>
          </Grid>

          <Table size="small" style={{ width: 'auto' }}>
            <TableBody>
              {this.props.maskingRuleValues.map((row:RedactRule) => (
                <TableRow key={row.key}>
                  <TableCell style={{ paddingLeft: 0 }}>
                    <FormControl variant="outlined" margin="dense">
                      <InputLabel>
                        Input
                      </InputLabel>
                      <Select
                        value={row.databaseTable}
                        onChange={(event) => this.props.handleRuleChange(row.key, event)}
                        name="databaseTable"
                        input={
                          <OutlinedInput
                            labelWidth={this.state.ruleLabelWidth}
                            name="rule"
                          />
                        }
                      >
                        {this.props.allDatabaseTables.map((dt:string) => (
                          <MenuItem key={dt} value={dt}>{dt}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField name="schema" defaultValue={row.schema} label="Schema" variant="outlined" onChange={(event) => this.props.handleRuleChange(row.key, event)} margin="dense" />
                  </TableCell>
                  <TableCell>
                    <TextField name="table" defaultValue={row.table} label="Table" variant="outlined" onChange={(event) => this.props.handleRuleChange(row.key, event)} margin="dense" />
                  </TableCell>
                  <TableCell>
                    <TextField name="column" defaultValue={row.column} label="Column" variant="outlined" onChange={(event) => this.props.handleRuleChange(row.key, event)} margin="dense" />
                  </TableCell>
                  <TableCell>
                    <FormControl variant="outlined" margin="dense">
                      <InputLabel>
                        Rule
                      </InputLabel>
                      <Select
                        value={row.rule}
                        onChange={(event) => this.props.handleRuleChange(row.key, event)}
                        name="rule"
                        input={
                          <OutlinedInput
                            labelWidth={this.state.ruleLabelWidth}
                            name="rule"
                          />
                        }
                      >
                        {this.props.maskingRules.map((rule:RedactRule) => (
                          <MenuItem key={rule.key} value={rule.key}>{rule.val}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Button variant="contained" color="secondary" size="small" onClick={() => this.props.deleteMaskingRule(row.key)}>
                        <DeleteIcon />&nbsp;&nbsp;Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )
    }
  }

  /* eslint-disable max-len */

  render() {
    return (
      <React.Fragment>
        <Box mt={8}>
          <Typography variant="h6" gutterBottom>
            Database Fields Containing PII/Confidential Info
          </Typography>

          <Box mb={4}>
            <Grid container>
              <Grid item xs={8}>
                <Typography variant="body1" gutterBottom>
                  You can use the Redactics PII Scanner to auto-detect your database fields containing PII, or else define your fields containing PII (and their redaction rules) here.
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {this.displayMaskingRules()}
        </Box>

      </React.Fragment>
    );
  }
}

export default WorkflowPostExport;

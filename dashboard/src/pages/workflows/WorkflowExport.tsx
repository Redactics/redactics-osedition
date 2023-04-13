import React from 'react';
import styled from 'styled-components';

import { spacing } from '@material-ui/system';

import {
  Typography,
  TextField as MuiTextField,
  FormControl as MuiFormControl,
  Button as MuiButton,
  Box,
  Select,
  MenuItem,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Grid as MuiGrid,
} from '@material-ui/core';

import {
  Add as AddIcon,
  HelpOutline as HelpIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
} from '@material-ui/icons';

const Grid = styled(MuiGrid)(spacing);

const TextFieldSpacing = styled(MuiTextField)(spacing);

const FormControlSpacing = styled(MuiFormControl)(spacing);

const FormControl = styled(FormControlSpacing)`
  min-width: 200px;
  max-width: 200px;
  display: inline;
`;

const TextField = styled(TextFieldSpacing)`
  width: 200px;
`;

const Button = styled(MuiButton)(spacing);

/* eslint-disable @typescript-eslint/no-empty-interface */

interface IProps {
  exportTableDataConfig: any;
  tableOutputOptions: any;
  constraintSchema: string;
  constraintTable: string;
  handleTableOutputChanges: any;
  allDatabaseTables: string[];
  showOutputOptions: any;
  currentDatabaseTable: string;
  triggerOutputOptions: any;
  deleteConstraint: any;
  hideOutputOptions: any;
  genConstraintSummary: any;
}

interface IState {

}

class WorkflowExport extends React.Component<IProps, IState> {
  constructor(props:IProps) {
    super(props);

    this.displayConstraintOptions = this.displayConstraintOptions.bind(this);
  }

  displayConstraintOptions() {
    const table = this.props.currentDatabaseTable;
    if (!this.props.tableOutputOptions.errors) {
      this.props.tableOutputOptions.errors = {};
    }

    return (
      <Box mt={4}>
        <FormControl fullWidth variant="outlined">
          <TextField
            error={this.props.tableOutputOptions.errors.schema}
            name="schema"
            label="Schema"
            value={this.props.constraintSchema}
            onChange={(event) => this.props.handleTableOutputChanges(event)}
          />
        </FormControl>

        <Box mt={4}>
          <FormControl fullWidth variant="outlined">
            <TextField
              error={this.props.tableOutputOptions.errors.table}
              name="table"
              label="Table"
              value={this.props.constraintTable}
              onChange={(event) => this.props.handleTableOutputChanges(event)}
            />
          </FormControl>
        </Box>

        <Box mt={4} display={(this.props.constraintSchema && this.props.constraintTable) ? 'block' : 'none'}>
          <FormControl>
            <Select
              name="sampleFields"
              value={this.props.tableOutputOptions.sampleFields}
              onChange={(event) => this.props.handleTableOutputChanges(event, table)}
            >
              <MenuItem key="created" value="created">Created</MenuItem>
              <MenuItem key="updated" value="updated">Updated</MenuItem>
              <MenuItem key="createdAndUpdated" value="createdAndUpdated">Created or updated</MenuItem>
            </Select>&nbsp;&nbsp;in the last&nbsp;&nbsp;
            <Select
              name="numDays"
              value={this.props.tableOutputOptions.numDays}
              onChange={(event) => this.props.handleTableOutputChanges(event, table)}
            >
              <MenuItem key="1" value="1">day</MenuItem>
              <MenuItem key="2" value="2">2 days</MenuItem>
              <MenuItem key="3" value="3">3 days</MenuItem>
              <MenuItem key="7" value="7">1 week</MenuItem>
              <MenuItem key="14" value="14">2 weeks</MenuItem>
              <MenuItem key="30" value="30">month</MenuItem>
              <MenuItem key="60" value="60">2 months</MenuItem>
              <MenuItem key="90" value="90">3 months</MenuItem>
              <MenuItem key="180" value="180">6 months</MenuItem>
              <MenuItem key="365" value="365">year</MenuItem>
            </Select>
          </FormControl>

          <Box mt={4} display={(this.props.tableOutputOptions.sampleFields.toLowerCase().includes("created")) ? "block" : "none"}>
            <FormControl fullWidth variant="outlined">
              <TextField
                error={this.props.tableOutputOptions.errors.createdAtField}
                name="createdAtField"
                label="Created At Field Name"
                value={this.props.tableOutputOptions.createdAtField}
                onChange={(event) => this.props.handleTableOutputChanges(event, table)}
                InputProps={{
                  endAdornment: <Tooltip title="(Required) field name in this table used for tracking created at timestamp" placement="right-start"><HelpIcon /></Tooltip>,
                }}
              />
            </FormControl>
          </Box>

          <Box mt={4} display={(this.props.tableOutputOptions.sampleFields.toLowerCase().includes("updated")) ? "block" : "none"}>
            <FormControl fullWidth variant="outlined">
              <TextField
                error={this.props.tableOutputOptions.errors.updatedAtField}
                name="updatedAtField"
                label="Updated At Field Name"
                value={this.props.tableOutputOptions.updatedAtField}
                onChange={(event) => this.props.handleTableOutputChanges(event, table)}
                InputProps={{
                  endAdornment: <Tooltip title="(Required) field name in this table used for tracking updated at timestamp" placement="right-start"><HelpIcon /></Tooltip>,
                }}
              />
            </FormControl>
          </Box>
        </Box>
      </Box>
    )
  }

  displayConstraintsTable() {
    let constraints:any = this.props.exportTableDataConfig.filter((config:any) => {
      return config.numDays
    });

    if (!constraints.length) {
      return (
        <Box>
          <Button variant="contained" color="secondary" size="small" onClick={(event) => this.props.triggerOutputOptions(event, null)}>
            <AddIcon />&nbsp;&nbsp;Add Data Sampling Constraint
          </Button>
        </Box>
      )
    }
    else {
      return (
        <Box>
          <Grid
            justify="space-between"
            container
            spacing={10}
          >
            <Grid item></Grid>
            <Grid item mb={6}>
              <Button variant="contained" color="secondary" size="small" onClick={(event) => this.props.triggerOutputOptions(event, null)}>
                <AddIcon />&nbsp;&nbsp;Add Data Sampling Constraint
              </Button>
            </Grid>
          </Grid>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Table</TableCell>
                <TableCell>Constraint</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
            {constraints.map((c:any) => {
              let tableName = c.table;
              return (
                <TableRow key={tableName}>
                  <TableCell>{tableName}</TableCell>
                  <TableCell>{this.props.genConstraintSummary(tableName)}</TableCell>
                  <TableCell>
                    <Button color="secondary" size="small" variant="contained" onClick={(event) => this.props.triggerOutputOptions(event, tableName)}>
                      <EditIcon />&nbsp;Edit
                    </Button>&nbsp;
                    <Button variant="contained" color="default" size="small" onClick={(event) => this.props.deleteConstraint(event, tableName)}>
                      <DeleteIcon />&nbsp;Delete
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            </TableBody>
          </Table>
        </Box>
      )
    }
  }

  render() {
    if (!this.props.allDatabaseTables) {
      return null;
    }
    return (
      <React.Fragment>
        <Box>
          <Typography variant="h4" gutterBottom>
            Table Data Options
          </Typography>

          <Grid container>
            <Grid item xs={8}>
              <Typography variant="body1" gutterBottom>
                If you want to constrain your outputs to a selected time range (creating smaller tables in the process) you can do so by adding your table constraints below. Note that if other tables depend on omitted data these relationships will be broken.
              </Typography>
            </Grid>
          </Grid>
  
          <Dialog
            fullWidth
            open={this.props.showOutputOptions}
            onClose={this.props.hideOutputOptions}
            maxWidth="md"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
          >
            <DialogTitle id="dialog-title">Data Sampling Constraint</DialogTitle>
            <DialogContent>
              <DialogContentText id="dialog-description">
                {this.displayConstraintOptions()}
              </DialogContentText>

              <DialogActions>
                <Button color="secondary" variant="contained" onClick={this.props.hideOutputOptions}>
                  Update
                </Button>
              </DialogActions>
            </DialogContent>
          </Dialog>

          <Box mt={8}>
            {this.displayConstraintsTable()}
          </Box>
        </Box>
      </React.Fragment>
    );
  }
}

export default WorkflowExport;

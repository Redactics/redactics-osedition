import React from 'react';
import styled from 'styled-components';

import { spacing } from '@material-ui/system';
import { blue } from '@material-ui/core/colors';

import {
  Typography,
  TextField as MuiTextField,
  FormControl as MuiFormControl,
  Button as MuiButton,
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  Chip,
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
} from '@material-ui/core';

import {
  Add as AddIcon,
  HelpOutline as HelpIcon,
  Edit as EditIcon,
  Info as InfoIcon,
} from '@material-ui/icons';

import { WorkflowRecord } from '../../types/redactics';

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
  workflow: WorkflowRecord;
  deleteExportTableColumn: any;
  addExportTableColumn: any;
  tableOutputOptions: any;
  handleTableOutputChanges: any;
  allDatabaseTables: string[];
  showOutputOptions: any;
  currentDatabaseTable: string;
  triggerOutputOptions: any;
  hideOutputOptions: any;
}

interface IState {

}

class WorkflowExport extends React.Component<IProps, IState> {
  constructor(props:IProps) {
    super(props);

    this.displayColumnData = this.displayColumnData.bind(this);
    this.displayRowsData = this.displayRowsData.bind(this);
    this.genName = this.genName.bind(this);
  }

  displayColumnData() {
    const table = this.props.currentDatabaseTable;
    if (!this.props.tableOutputOptions[table]) { return; }

    return (
      <Box>
         <RadioGroup aria-label="exportColumns" name="exportColumns" value={this.props.tableOutputOptions[table].exportColumns} onChange={(event) => this.props.handleTableOutputChanges(event, table)}>
          <FormControlLabel value="all" control={<Radio />} label="Export All Columns" />
          <FormControlLabel value="specific" control={<Radio />} label="Export Specific Columns" />
        </RadioGroup>

        <Box mt={4} display={(this.props.tableOutputOptions[table].exportColumns === "specific") ? 'block' : 'none'}>
          {this.props.tableOutputOptions[table].fields.map((field: string) => (
            <Box key={field} display="inline" pr={1}>
              <Chip
                key={field}
                label={field}
                onDelete={(event) => this.props.deleteExportTableColumn(event, table, field)}
              />
            </Box>
          ))}

          <Box mt={2}>
            <FormControl fullWidth>
              <TextField
                error={this.props.tableOutputOptions[table].errors.addColumn}
                name="addColumn"
                label="Add Column"
                value={this.props.tableOutputOptions[table].addColumn}
                onChange={(event) => this.props.handleTableOutputChanges(event, table)}
              />
            </FormControl>
            <Box mt={2}>
              <Button color="secondary" variant="outlined" onClick={(event) => this.props.addExportTableColumn(event, table)}>
                <AddIcon />&nbsp;Add
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    )
  }

  disabledAlert(workflowType:string) {
    return (workflowType === "multiTenantWebERL") ? (
      <Box mt={4}>
        <InfoIcon style={{ color: blue[500], fontSize: 25 }} /> <b>Web-based workflows only support exporting all rows, and not rows from a specific time period.</b>
      </Box>
    ) : null;
  }

  displayRowsData() {
    const table = this.props.currentDatabaseTable;
    if (!this.props.tableOutputOptions[table]) { return; }

    return (
      <Box mt={4}>
          {this.disabledAlert(this.props.workflow.workflowType)}
         <RadioGroup aria-label="exportRows" name="exportRows" value={this.props.tableOutputOptions[table].exportRows} onChange={(event) => this.props.handleTableOutputChanges(event, table)}>
          <FormControlLabel value="all" control={<Radio />} label="All Rows" />
          <FormControlLabel disabled={!(this.props.workflow.workflowType === "ERL")} value="specific" control={<Radio />} label="Rows From a Specific Time Period" />
        </RadioGroup>

        <Box mt={4} display={(this.props.tableOutputOptions[table].exportRows === "specific") ? 'block' : 'none'}>
          <FormControl>
            <Select
              name="sampleFields"
              value={this.props.tableOutputOptions[table].sampleFields}
              onChange={(event) => this.props.handleTableOutputChanges(event, table)}
            >
              <MenuItem key="created" value="created">Created</MenuItem>
              <MenuItem key="updated" value="updated">Updated</MenuItem>
              <MenuItem key="createdAndUpdated" value="createdAndUpdated">Created or updated</MenuItem>
            </Select>&nbsp;&nbsp;in the last&nbsp;&nbsp;
            <Select
              name="numDays"
              value={this.props.tableOutputOptions[table].numDays}
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

          <Box mt={4}>
            <FormControl fullWidth variant="outlined">
              <TextField
                error={this.props.tableOutputOptions[table].errors.createdAtField}
                name="createdAtField"
                label="Created At Field Name"
                value={this.props.tableOutputOptions[table].createdAtField}
                onChange={(event) => this.props.handleTableOutputChanges(event, table)}
                InputProps={{
                  endAdornment: <Tooltip title="(Required) field name in this table used for tracking created at timestamp" placement="right-start"><HelpIcon /></Tooltip>,
                }}
              />
            </FormControl>
          </Box>

          <Box mt={4}>
            <FormControl fullWidth variant="outlined">
              <TextField
                error={this.props.tableOutputOptions[table].errors.updatedAtField}
                name="updatedAtField"
                label="Updated At Field Name"
                value={this.props.tableOutputOptions[table].updatedAtField}
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

  genName(dt:string) {
    const display:string[] = [];
    const tableArr:string[] = dt.split(': ');
    const table:string = tableArr[(tableArr.length - 1)];
    // let column:string = "columns";
    // if (this.props.tableOutputOptions[table] && 
    //   this.props.tableOutputOptions[table].fields && 
    //   this.props.tableOutputOptions[table].fields.length === 1 &&
    //   this.props.tableOutputOptions[table].exportColumns !== "all") {
    //     column = "column";
    // }
    // display.push((this.props.tableOutputOptions[table] && 
    //   this.props.tableOutputOptions[table].fields && 
    //   this.props.tableOutputOptions[table].exportColumns !== "all") ? 
    //     this.props.tableOutputOptions[table].fields.length + " " + column + "," : "all columns,");
    display.push((this.props.tableOutputOptions[table] && 
      this.props.tableOutputOptions[table].numDays && 
      this.props.tableOutputOptions[table].exportRows !== "all") ? 
        "rows for the last " + this.props.tableOutputOptions[table].numDays + " days" : "all table rows");
    return display.join(' ');
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

          <Dialog
            fullWidth
            open={this.props.showOutputOptions}
            onClose={this.props.hideOutputOptions}
            maxWidth="md"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
          >
            <DialogTitle id="dialog-title">Table Options: {this.props.currentDatabaseTable}</DialogTitle>
            <DialogContent>
              <DialogContentText id="dialog-description">
                {/* <Box>
                  <b>Columns</b>
                </Box>

                {this.displayColumnData()}

                <Box mt={4}>
                  <b>Rows</b>
                </Box> */}

                <Box>
                  To limit the initial copy of your data to a specific time range, specify this time range below. This may be useful if older data is not particularly relevant to you and/or your output table is large.
                </Box>

                {this.displayRowsData()}
              </DialogContentText>

              <DialogActions>
                <Button color="secondary" variant="contained" onClick={this.props.hideOutputOptions}>
                  Update
                </Button>
              </DialogActions>
            </DialogContent>
          </Dialog>

          <Box mt={8}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Table</TableCell>
                  <TableCell>Summary</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
              {this.props.allDatabaseTables.map((dt:string) => {
                const tableArr:string[] = dt.split(': ');
                const table:string = tableArr[(tableArr.length - 1)];
                return (
                  <TableRow key={table}>
                    <TableCell>{table}</TableCell>
                    <TableCell>{this.genName(dt)}</TableCell>
                    <TableCell>
                      <Button color="secondary" size="small" variant="contained" onClick={(event) => this.props.triggerOutputOptions(event, table)}>
                        <EditIcon />&nbsp;Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </React.Fragment>
    );
  }
}

export default WorkflowExport;

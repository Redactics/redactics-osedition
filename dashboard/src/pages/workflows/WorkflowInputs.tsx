import React from 'react';
import styled from 'styled-components';
import { withStyles } from '@material-ui/core/styles';

import { spacing } from '@material-ui/system';

import {
  Button as MuiButton,
  TextField as MuiTextField,
  Select as MuiSelect,
  FormControl as MuiFormControl,
  InputLabel,
  MenuItem,
  Box,
  Link,
  Checkbox,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid as MuiGrid,
} from '@material-ui/core';

import {
  Add as AddIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
} from '@material-ui/icons';

import { AgentRecord, WorkflowRecord, AgentInputRecord, WorkflowInputRecord } from '../../types/redactics';

const Grid = styled(MuiGrid)(spacing);

const Button = styled(MuiButton)(spacing);

const TextFieldSpacing = styled(MuiTextField)(spacing);

const FormControlSpacing = styled(MuiFormControl)(spacing);

const FormControl = styled(FormControlSpacing)`
  min-width: 200px;
  max-width: 200px;
`;

const WideFormControl = styled(FormControlSpacing)`
  min-width: 400px;
  max-width: 400px;
`;

const TextField = styled(TextFieldSpacing)`
  width: 200px;
`;

const NWTableCell = withStyles({
  root: {
    whiteSpace: 'nowrap',
  },
})(TableCell);

const Select = styled(MuiSelect)(spacing);

const styles = {
  selectAdornment: {
    marginRight: '-30px',
  },
};

/* eslint-disable @typescript-eslint/no-empty-interface */

interface IProps {
  agents: AgentRecord[];
  errors?: any;
  workflow: WorkflowRecord;
  agentInputs: AgentInputRecord[];
  classes: any;
  editInputDialog: boolean;
  triggerEditInputDialog: any;
  saveInputChanges: any;
  input: WorkflowInputRecord;
  inputs: WorkflowInputRecord[];
  handleInputChanges: any;
  selectInputSource: any;
  handleAddTable: any;
  addTable: string;
  triggerAddTable: any;
  hideInputDialog: any;
  deleteDatabaseTable: any;
  handleSnackbarClose: any;
  addTableSelection: any;
  deleteTableSelection: any;
}

interface IState {
 
}

class WorkflowInputs extends React.Component<IProps, IState> {
  getAgent() {
    const agent = this.props.agents.filter((a:AgentRecord) => (
      (a.uuid === this.props.workflow.agentId)));
    // set stub result if method is called before data has been populated,
    // there should always be an agent found
    return (agent.length) ? agent[0] : {
      configPath: '',
      namespace: '',
    };
  }

  displayTableSelection(tableSelection:string) {
    let addButton = "Add Table";
    if (tableSelection === "allExclude") { addButton += " Exclusion"; }
    if (!this.props.input.tables || !this.props.input.tables.length) {
      return (
        <Box>
          <Button variant="contained" color="secondary" size="small" onClick={this.props.addTableSelection}>
            <AddIcon />&nbsp;&nbsp;{addButton}
          </Button>
        </Box>
      )
    }
    else {
      return (
        <Table size="small" style={{ width: 'auto' }}>
          <TableBody>
            {this.props.input.tables.map((row:any, idx:number) => (
              <TableRow key={idx}>
                <TableCell style={{ paddingLeft: 0 }}>
                  <TextField
                    name="addSchema"
                    label="Schema"
                    value={row.split('.')[0]}
                    onChange={(event) => this.props.handleAddTable(event, idx, "schema")}
                    variant="outlined"
                    margin="dense"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    name="addTable"
                    label="Table"
                    value={row.split('.')[1]}
                    onChange={(event) => this.props.handleAddTable(event, idx, "table")}
                    variant="outlined"
                    margin="dense"
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Button variant="contained" color="secondary" size="small" onClick={() => this.props.deleteTableSelection(idx)}>
                      <DeleteIcon />&nbsp;&nbsp;Delete
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell>
                <Button variant="contained" color="secondary" size="small" onClick={this.props.addTableSelection}>
                  <AddIcon />&nbsp;&nbsp;Add
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }
  }

  editInputDialogContent() { 
    return (
      <Box>
        {this.props.errors.JSX}

        <Box mt={8}>
          <Box display={(this.props.workflow.workflowType === "mockDatabaseMigration") ? "none" : "block"}>
            <WideFormControl margin="dense" fullWidth>
              <InputLabel>
                Table Selection
              </InputLabel>
              <Select
                value={this.props.input.tableSelection}
                name="tableSelection"
                onChange={(event) => this.props.handleInputChanges(event, this.props.input)}
              >
                <MenuItem key="none" value="none">None</MenuItem>
                <MenuItem key="all" value="all">Select all tables in all schema</MenuItem>
                <MenuItem key="allExclude" value="allExclude">Select all tables in all schema with specified exclusions</MenuItem>
                <MenuItem key="specific" value="specific">Select specific tables</MenuItem>
              </Select>
            </WideFormControl>
          </Box>

          <Box mt={4} display={(this.props.input.tableSelection === "allExclude" || this.props.input.tableSelection === "specific") ? "block" : "none"}>
            You can use wildcards (i.e. <code><b>*</b></code>) for broad pattern matching. For example, <b><code>public.account_*</code></b> will match all tables starting with "account_" in the public schema, and <b><code>company_*.users</code></b> will match all users tables in schema starting with "company_". If you aren't aware of what schema your tables reside in, they probably reside in <b><code>public</code></b>, which is the PostgreSQL default.
            <Box mt={8}>
              {this.displayTableSelection(this.props.input.tableSelection)}
            </Box>
          </Box>
        </Box>
      </Box>
    ) 
  }

  outputMockConstraints() {
    let foundConstraints:boolean = false;
    let tables:string = "";
    let workflowInput:any = {
      uuid: ""
    };
    this.props.agentInputs.forEach((input:AgentInputRecord) => {
      workflowInput = this.props.inputs.find((i:WorkflowInputRecord) => {
        return (i.uuid === input.uuid)
      });
      if (workflowInput && workflowInput.tables && workflowInput.tables.length) {
        foundConstraints = true;
        tables = "all tables except " + workflowInput.tables.join(', ');
      }
    });
    if (!foundConstraints) {
      return (
        <Box>
          <Button variant="contained" color="secondary" size="small" onClick={() => this.props.triggerEditInputDialog({
            inputName: workflowInput.inputName,
            uuid: workflowInput.uuid,
            enabled: workflowInput.enabled,
            tableSelection: "allExclude",
            tables: ["public"]
          })}>
            <AddIcon />&nbsp;&nbsp;Add Database Cloning Constraint
          </Button>
        </Box>
      )
    }
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Tables</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow key={workflowInput.uuid}>
            <TableCell>{tables}</TableCell>
            <NWTableCell>
              <Button variant="contained" color="secondary" size="small" onClick={() => this.props.triggerEditInputDialog(workflowInput)}>
                <EditIcon/>&nbsp;Edit Table Selection
              </Button>
            </NWTableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  outputDataSources() {
    if (this.props.agentInputs.length) {
      if (this.props.workflow.workflowType === "mockDatabaseMigration") {
        const selectedInput:string = (this.props.inputs && this.props.inputs.length && this.props.inputs[0]) ? this.props.inputs[0].uuid : "";
        return (
          <Box>
            <FormControl margin="dense" fullWidth>
              <InputLabel>
                Input Source
              </InputLabel>
              <Select
                value={selectedInput}
                name="inputSource"
                onChange={(event) => this.props.selectInputSource(event)}
              >
                {this.props.agentInputs.map((input:AgentInputRecord) => (
                  <MenuItem key={input.uuid} value={input.uuid}>{input.inputName}</MenuItem>
                ))}
              </Select>
            </FormControl>
              
            <Box mt={8}>
              <Typography variant="h6" gutterBottom>
                Database Cloning Constraints
              </Typography>

              <Grid container>
                <Grid item xs={8}>
                  <Typography variant="body1" gutterBottom>
                    If you want to clone your database faster you can do so by excluding certain tables which are irrelevant to testing your migration. This can be changed at any time to support your specific database migration.
                  </Typography>
                </Grid>
              </Grid>

              <Box mt={8}>
                {this.outputMockConstraints()}
              </Box>
            </Box>
          </Box>
        )
      }
      else {
        return (
          <Box>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Enabled</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Tables to Extract</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {this.props.agentInputs.map((input:AgentInputRecord) => {
                  let workflowInput:any = this.props.inputs.find((i:WorkflowInputRecord) => {
                    return (i.uuid === input.uuid)
                  });
                  let inputEnabled:boolean = (workflowInput) ? workflowInput.enabled : false;
                  let tables:string = "";
                  if (workflowInput && workflowInput.tableSelection) {
                    switch (workflowInput.tableSelection) {
                      case 'all':
                      tables = "all tables";
                      break;
  
                      case 'allExclude':
                      tables = (!workflowInput.tables || !workflowInput.tables.length) ? "all tables" : "all tables except " + workflowInput.tables.join(', ');
                      break;
  
                      case 'specific':
                      tables = (!workflowInput.tables || !workflowInput.tables.length) ? "none" : workflowInput.tables.join(', ');
                      break;
                    }
                  }
                  else {
                    workflowInput = {
                      enabled: false,
                      uuid: input.uuid,
                      tables: [],
                      tableSelection: "",
                    }
                    tables = "none selected";
                  }
                  return (
                    <TableRow key={input.uuid}>
                      <TableCell>
                        <Checkbox
                          checked={inputEnabled}
                          name="enabled"
                          color="primary"
                          onChange={(event) => this.props.handleInputChanges(event, workflowInput)}
                        />
                      </TableCell>
                      <TableCell>{input.inputName}</TableCell>
                      <TableCell>{tables}</TableCell>
                      <NWTableCell>
                        <Button variant="contained" color="secondary" size="small" onClick={() => this.props.triggerEditInputDialog(workflowInput)}>
                          <EditIcon/>&nbsp;Edit Table Selection
                        </Button>
                      </NWTableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )
      }
    }
    else {
      return (
        <Box>
          Workflows require at least one input source. Ensure at least one is selected within the "Agent Settings" section in the <Link href="/agents">Agents</Link> page.
        </Box>
      )
    }
  }

  /* eslint-disable max-len */

  render() {
    const title = (this.props.workflow.workflowType === "mockDatabaseMigration") ? "Input Source" : "Input Sources";
    return (
      <React.Fragment>
        <Box mt={4}>
          <Typography variant="h4" gutterBottom>
            {title}
          </Typography>
        </Box>

        <Dialog
          open={this.props.editInputDialog}
          onClose={this.props.hideInputDialog}
          maxWidth="md"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
          fullWidth
        >
          <DialogTitle id="dialog-title">Edit Table Selection</DialogTitle>
          <DialogContent>
            <DialogContentText id="dialog-description">
              {this.editInputDialogContent()}
            </DialogContentText>

            <DialogActions>
              <Button color="secondary" variant="contained" onClick={this.props.saveInputChanges}>
                Update
              </Button>
            </DialogActions>
          </DialogContent>
        </Dialog>

        <Box mt={8}>
          {this.outputDataSources()}
        </Box>
       
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(WorkflowInputs);

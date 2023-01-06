import React from 'react';
import styled from 'styled-components';
import { withStyles } from '@material-ui/core/styles';

import { spacing } from '@material-ui/system';
import { blue } from '@material-ui/core/colors';

import {
  Button as MuiButton,
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
  InputAdornment,
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
  Chip,
  ExpansionPanel,
  ExpansionPanelSummary,
  ExpansionPanelDetails as MuiExpansionPanelDetails,
  Grid as MuiGrid,
  Paper,
  RadioGroup,
  Radio,
} from '@material-ui/core';

import {
  Add as AddIcon,
  Edit as EditIcon,
  HelpOutline as HelpIcon,
  DeleteOutline as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
} from '@material-ui/icons';

import { AgentRecord, WorkflowRecord, AgentInputRecord, WorkflowInputRecord } from '../../types/redactics';

const Button = styled(MuiButton)(spacing);

const TextFieldSpacing = styled(MuiTextField)(spacing);

const FormControlSpacing = styled(MuiFormControl)(spacing);

const FormControl = styled(FormControlSpacing)`
  min-width: 200px;
  max-width: 200px;
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

const Grid = styled(MuiGrid)(spacing);

const ExpansionPanelDetails = withStyles({
  root: {
    display: 'block',
  },
})(MuiExpansionPanelDetails);

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

  editInputDialogContent() { 
    return (
      <Box>
        {this.props.errors.JSX}

        <Box mt={8}>
          <Typography variant="h4" gutterBottom>
            Tables to Extract
          </Typography>

          <Box>
            {this.props.input.tables.map((table: string) => (
              <Box key={table} display="inline" pr={1}>
                <Chip
                  key={table}
                  label={table}
                  onDelete={() => this.props.deleteDatabaseTable(table)}
                />
              </Box>
            ))}
          </Box>

          <Box mt={4}>
            <FormControl fullWidth>
              <TextField
                error={this.props.errors.addTable}
                name="addTable"
                label="Add Table"
                value={this.props.addTable}
                onChange={(event) => this.props.handleAddTable(event)}
              />
            </FormControl>
            <Box mt={2}>
              <Button color="secondary" variant="outlined" onClick={this.props.triggerAddTable}>
                <AddIcon />&nbsp;Add
              </Button>
            </Box>
          </Box>

        </Box>
      </Box>
    ) 
  }

  outputInputs() {
    if (this.props.agentInputs.length) {
      if (this.props.workflow.workflowType === "mockDatabaseMigration") {
        const selectedInput = (this.props.inputs && this.props.inputs.length && this.props.inputs[0]) ? this.props.inputs[0].uuid : "";
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
                  let tables:string = (workflowInput && workflowInput.tables && workflowInput.tables.length) ? workflowInput.tables.join(', ') : "none selected";
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
          {this.outputInputs()}
        </Box>
       
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(WorkflowInputs);

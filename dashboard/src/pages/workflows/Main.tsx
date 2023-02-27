import React from 'react';
import styled from 'styled-components';
import { withStyles } from '@material-ui/core/styles';

import Helmet from 'react-helmet';

// import { red, green, blue } from "@material-ui/core/colors";

import {
  Divider as MuiDivider,
  FormControl as MuiFormControl,
  Grid as MuiGrid,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  ExpansionPanel,
  ExpansionPanelDetails,
  ExpansionPanelSummary,
  TextField as MuiTextField,
  Button as MuiButton,
  InputLabel,
  Select as MuiSelect,
  MenuItem,
  Box,
  InputAdornment,
  Tooltip,
} from '@material-ui/core';

import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  FormatListBulleted as FormatListBulletedIcon,
  HelpOutline as HelpIcon,
} from '@material-ui/icons';

import {
  Save as SaveIcon,
} from 'react-feather';

import { spacing } from '@material-ui/system';
import {
  WorkflowRecord, AgentInputRecord, InputRecord, AgentRecord, RedactRuleSet, RedactRulePreset,
} from '../../types/redactics';
import RedacticsContext from '../../contexts/RedacticsContext';

import Workflow from './Workflow';

const Divider = styled(MuiDivider)(spacing);

const FormControlSpacing = styled(MuiFormControl)(spacing);

const FormControl = styled(FormControlSpacing)`
  min-width: 400px;
  max-width: 400px;
`;

const Grid = styled(MuiGrid)(spacing);

const TextFieldSpacing = styled(MuiTextField)(spacing);

const TextField = styled(TextFieldSpacing)`
  width: 400px;
`;

const Select = styled(MuiSelect)(spacing);

const Button = styled(MuiButton)(spacing);

const styles = {
  selectAdornment: {
    marginRight: '-30px',
  },
};

/* eslint-disable @typescript-eslint/no-empty-interface */

interface IProps {
  classes: any;
}

interface IState {
  saveButtonDisabled: boolean;
  ruleLegendDialog: boolean;
  newWorkflowDialog: boolean;
  workflows: WorkflowRecord[];
  agentInputs: AgentInputRecord[];
  allInputs: InputRecord[];
  presets: RedactRulePreset[];
  redactrulesets: RedactRuleSet[];
  agents: AgentRecord[];
  newWorkflowName: string;
  newWorkflowAgent: string;
  newWorkflowType: string;
  dbLimitError: boolean;
  // dialog toggles
  deleteWorkflowConfirmation: boolean;
}

class Workflows extends React.Component<IProps, IState> {
  static contextType = RedacticsContext;

  constructor(props: IProps) {
    super(props);

    this.state = {
      saveButtonDisabled: true,
      ruleLegendDialog: false,
      newWorkflowDialog: false,
      workflows: [],
      agentInputs: [],
      allInputs: [],
      presets: [],
      redactrulesets: [],
      agents: [],
      newWorkflowName: '',
      newWorkflowAgent: '',
      newWorkflowType: '',
      dbLimitError: false,
      deleteWorkflowConfirmation: false,
    };

    this.handleChangeAdd = this.handleChangeAdd.bind(this);
    this.handleWFChanges = this.handleWFChanges.bind(this);
    this.addWorkflow = this.addWorkflow.bind(this);
    this.ruleLegendOpen = this.ruleLegendOpen.bind(this);
    this.ruleLegendClose = this.ruleLegendClose.bind(this);
    this.newWorkflowOpen = this.newWorkflowOpen.bind(this);
    this.newWorkflowClose = this.newWorkflowClose.bind(this);
    this.refreshWorkflows = this.refreshWorkflows.bind(this);
    this.deleteWorkflow = this.deleteWorkflow.bind(this);
    this.dbLimitErrorClose = this.dbLimitErrorClose.bind(this);
  }

  async refreshWorkflows() {
    try {
      const response = await fetch(`${this.context.apiUrl}/workflow`);

      const data = await response.json();

      data.workflows.map((workflow:any) => {
        // set some defaults
        workflow.migrationNamespace = workflow.migrationNamespace || "default";
        workflow.migrationDatabaseClone = workflow.migrationDatabaseClone || "redactics_clone";

        return workflow;
      });

      this.setState({
        workflows: data.workflows,
        agentInputs: data.agentInputs,
        allInputs: data.allInputs,
        presets: data.presets,
        redactrulesets: data.redactrulesets,
        agents: data.agents,
      });
    } catch (err) {
      // console.log('CATCH ERR', error);
    }
  }

  componentDidMount() {
    this.refreshWorkflows();
  }

  handleChangeAdd(event:any) {
    const state:IState = this.state;

    switch (event.target.name) {
      case 'name':
        state.newWorkflowName = event.target.value;
        state.saveButtonDisabled = (state.newWorkflowType === "ERL")
          ? !(event.target.value && state.newWorkflowAgent)
          : !(event.target.value && state.newWorkflowType);
        this.setState(state);
        break;

      case 'agentId':
        state.newWorkflowAgent = event.target.value;
        state.saveButtonDisabled = !(state.newWorkflowName);
        this.setState(state);
        break;

      case 'workflowType':
        state.newWorkflowType = event.target.value;
        state.saveButtonDisabled = (event.target.value === "ERL")
        ? !(state.newWorkflowName && state.newWorkflowAgent)
        : !(state.newWorkflowName && state.newWorkflowType);
        this.setState(state);
        break;

      default:
    }
  }

  async addWorkflow() {
    this.setState({
      saveButtonDisabled: true,
    });

    try {
      const response = await fetch(`${this.context.apiUrl}/workflow`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: this.state.newWorkflowName,
          agentId: this.state.newWorkflowAgent,
          workflowType: this.state.newWorkflowType,
        }),
      });

      await response.json();
      this.refreshWorkflows();

      this.setState({
        newWorkflowDialog: false,
        newWorkflowName: '',
        newWorkflowAgent: '',
      });
    } catch (err) {
      // console.log('CATCH ERR', error);
    }
  }

  async deleteWorkflow(workflowId:string) {
    try {
      await fetch(`${this.context.apiUrl}/workflow/${workflowId}`, {
        method: 'delete',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.refreshWorkflows();

      this.setState({
        deleteWorkflowConfirmation: false,
      });
    } catch (err) {
      this.setState({
        deleteWorkflowConfirmation: false,
      });
    }
  }

  newWorkflowOpen() {
    this.setState({
      newWorkflowDialog: true,
    });
  }

  newWorkflowClose() {
    this.setState({
      newWorkflowDialog: false,
    });
  }

  dbLimitErrorClose() {
    this.setState({
      dbLimitError: false,
    });
  }

  ruleLegendOpen() {
    this.setState({
      ruleLegendDialog: true,
    });
  }

  ruleLegendClose() {
    this.setState({
      ruleLegendDialog: false,
    });
  }

  handleWFChanges(event:any, workflowId:string) {
    const workflows = this.state.workflows.map((d:any) => {
      const workflow = d;
      if (workflow.uuid === workflowId) {
        workflow[event.target.name] = event.target.value;
      }

      return workflow;
    });

    this.setState({
      workflows,
    });
  }

  render() {
    return (
      <React.Fragment>
        <Helmet title="Workflow Configurations" />

        <Grid
          justify="space-between"
          container
          spacing={10}
        >
          <Grid item xs={4} mb={6}>
            <Typography variant="h1" gutterBottom display="inline">
              Workflow Configurations
            </Typography>
          </Grid>
        </Grid>

        <Divider my={6} />

        <Box mt={4}>
          <Typography variant="body1" gutterBottom>
            Build and maintain your data management workflows here. Configuration changes will be picked up by your installed Agent usually within a few minutes.
          </Typography>
        </Box>

        <Grid
          justify="space-between"
          container
          spacing={10}
          mt={8}
        >
          <Grid item></Grid>
          <Grid item mb={6}>
            <div>
              <Button variant="contained" color="secondary" size="small" onClick={this.ruleLegendOpen}>
                <FormatListBulletedIcon />&nbsp;
                PII Ruleset Legend
              </Button>&nbsp;
              <Button variant="contained" color="secondary" size="small" onClick={this.newWorkflowOpen}>
                <AddIcon />&nbsp;
                Define New Workflow
              </Button>
            </div>
          </Grid>
        </Grid>

        <Dialog
          open={this.state.ruleLegendDialog}
          onClose={this.ruleLegendClose}
          aria-labelledby="legend-title"
          aria-describedby="legend-description"
        >
          <DialogTitle id="legend-title">PII Ruleset Legend</DialogTitle>
          <DialogContent>
            <DialogContentText id="legend-description">
              <ExpansionPanel>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Redact Email</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  <Typography>
                    Transform emails to unique email address derived from the row&apos;s primary
                    key, constructed based on provided prefix and domain - i.e.
                    <code>[prefix][primarykey]@[domain]</code>
                  </Typography>
                </ExpansionPanelDetails>
              </ExpansionPanel>

              <ExpansionPanel>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Destruction</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  <Typography>
                    Replace data with a null value
                  </Typography>
                </ExpansionPanelDetails>
              </ExpansionPanel>

              <ExpansionPanel>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Replacement</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  <Typography>
                    Replace data with a provided value
                  </Typography>
                </ExpansionPanelDetails>
              </ExpansionPanel>

              <ExpansionPanel>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Random String</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  <Typography>
                    Replace data with a random alphanumeric string of a provided length
                  </Typography>
                </ExpansionPanelDetails>
              </ExpansionPanel>
            </DialogContentText>
          </DialogContent>
        </Dialog>

        <Dialog
          open={this.state.newWorkflowDialog}
          onClose={this.newWorkflowClose}
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
        >
          <DialogTitle id="dialog-title">Add Workflow</DialogTitle>
          <DialogContent>
            <form noValidate autoComplete="off">
              <Box>
                Create a name for this workflow, and assign a Redactics Agent to carry out the work defined by this workflow.
              </Box>

              <Box mt={4}>
                <FormControl fullWidth>
                  <TextField
                    name="name"
                    label="Workflow Name"
                    onChange={this.handleChangeAdd}
                    value={this.state.newWorkflowName}
                  />
                </FormControl>
              </Box>

              <Box mt={4}>
                <FormControl margin="dense" fullWidth>
                  <InputLabel>
                    Workflow Type
                  </InputLabel>
                  <Select
                    value={this.state.newWorkflowType}
                    name="workflowType"
                    onChange={this.handleChangeAdd}
                    endAdornment={
                      <InputAdornment className={this.props.classes.selectAdornment} position="end">
                        <Tooltip title="The web-based ERL testing option allows you to test ERL workflows with some preset sample dataset options without having to install the Redactics Agent into your own infrastructure. This option is multi-tenant, but a single-tenant mode is available you can run with your own datasets - contact us for more info." placement="right-start"><HelpIcon /></Tooltip>
                      </InputAdornment>
                    }
                  >
                    <MenuItem key="ERL" value="ERL">ERL (Extract, Redact, Load)</MenuItem>
                    <MenuItem key="mockDatabaseMigration" value="mockDatabaseMigration">Database Clone for Migration Dry-run</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box mt={4} display={(this.state.newWorkflowType.match(/^(ERL|mockDatabaseMigration)/)) ? 'block' : 'none'}>
                <FormControl fullWidth>
                  <InputLabel htmlFor="agentId">Redactics Agent</InputLabel>
                  <Select
                    name="agentId"
                    onChange={this.handleChangeAdd}
                    value={this.state.newWorkflowAgent}
                  >
                    {this.state.agents.map((agent:AgentRecord) => (
                      <MenuItem key={agent.uuid} value={agent.uuid}>{agent.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box mt={8}>
                <DialogActions>
                  <Button color="secondary" onClick={this.newWorkflowClose}>
                    Cancel
                  </Button>

                  <Button color="secondary" variant="contained" disabled={this.state.saveButtonDisabled} onClick={this.addWorkflow}>
                    Save&nbsp;<SaveIcon />
                  </Button>
                </DialogActions>
              </Box>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={this.state.dbLimitError}
          onClose={this.dbLimitErrorClose}
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
        >
          <DialogTitle id="dialog-title">You&apos;ve Reached Your Account Limit</DialogTitle>
          <DialogContent>
            <Box>
              This Redactics account is currently limited to support defining only a single
              database. Please contact us if you wish to upgrade this account.
            </Box>

            <DialogActions>
              <Button color="secondary" onClick={this.dbLimitErrorClose}>
                Okay
              </Button>
            </DialogActions>
          </DialogContent>
        </Dialog>

        {this.state.workflows.map((workflow:WorkflowRecord) => <Workflow
          workflow={workflow}
          presets={this.state.presets}
          redactrulesets={this.state.redactrulesets}
          agents={this.state.agents}
          agentInputs={this.state.agentInputs}
          allInputs={this.state.allInputs}
          key={workflow.uuid}
          handleWFChanges={this.handleWFChanges}
          deleteWorkflow={this.deleteWorkflow}
        />)}

      </React.Fragment>
    );
  }
}


export default withStyles(styles)(Workflows);
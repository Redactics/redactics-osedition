import React from 'react';
import styled from 'styled-components';

import Helmet from 'react-helmet';
import { CopyToClipboard } from 'react-copy-to-clipboard';


// import { red, green, blue } from "@material-ui/core/colors";

import {
  Divider as MuiDivider,
  FormControl as MuiFormControl,
  Grid as MuiGrid,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField as MuiTextField,
  Button as MuiButton,
  Tooltip,
  InputAdornment,
  Box,
  Snackbar,
  IconButton,
  FormControlLabel,
  Checkbox,
} from '@material-ui/core';

import {
  Add as AddIcon,
  HelpOutline as HelpIcon,
  Close as CloseIcon,
  LockOpen as LockOpenIcon,
} from '@material-ui/icons';

import {
  Save as SaveIcon,
  Clipboard as ClipboardIcon,
} from 'react-feather';

import { spacing } from '@material-ui/system';

import { Alert as MuiAlert } from '@material-ui/lab';

import { AgentRecord, InputRecord } from '../../types/redactics';
import RedacticsContext from '../../contexts/RedacticsContext';

import Agent from './Agent';

const Divider = styled(MuiDivider)(spacing);

const Grid = styled(MuiGrid)(spacing);

const TextFieldSpacing = styled(MuiTextField)(spacing);

const TextField = styled(TextFieldSpacing)`
  width: 400px;
`;

const FormControlSpacing = styled(MuiFormControl)(spacing);

const FormControl = styled(FormControlSpacing)`
  min-width: 400px;
  max-width: 800px;
`;

const Button = styled(MuiButton)(spacing);

const Alert = styled(MuiAlert)(spacing);

/* eslint-disable @typescript-eslint/no-empty-interface */

interface IProps {

}

interface IState {
  namespace: string;
  configPath: string;
  saveButtonDisabled: boolean;
  agents: AgentRecord[];
  inputs: InputRecord[];
  helmConfig: string;
  configMaxWidth: any;
  newAgentId: string;
  illegalChars: boolean;
  sampleDBSelected: boolean;
  sampleAgentConfirmationDialog: boolean;
  useNodeSelector: boolean;
  nodeSelectorLabelKey: string;
  nodeSelectorLabelValue: string;
  disableCancel: boolean;
  errors: any;
  showClipboardSnackbar: boolean;
  showSaveSnackbar: boolean;
  agentName: string;
  nodeSelector: string;
  selectedInputs: string[];
  showInstallAgentDialog: boolean;
}

class Agents extends React.Component<IProps, IState> {
  static contextType = RedacticsContext;

  constructor(props: IProps) {
    super(props);

    this.state = {
      namespace: 'redactics',
      configPath: '~/.redactics/values.yaml',
      saveButtonDisabled: true,
      agents: [],
      inputs: [],
      helmConfig: '',
      configMaxWidth: 'md',
      newAgentId: '',
      illegalChars: false,
      sampleDBSelected: false,
      sampleAgentConfirmationDialog: false,
      useNodeSelector: false,
      nodeSelectorLabelKey: 'nodePool',
      nodeSelectorLabelValue: 'agent',
      showClipboardSnackbar: false,
      showSaveSnackbar: false,
      disableCancel: false,
      agentName: '',
      nodeSelector: '',
      selectedInputs: [],
      errors: {
        agentName: false,
        namespace: false,
        configPath: false,
        illegalChars: ''
      },
      showInstallAgentDialog: false,
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleInstallAgent = this.handleInstallAgent.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleErrors = this.handleErrors.bind(this);
    this.deleteAgent = this.deleteAgent.bind(this);
    this.clipboardCopy = this.clipboardCopy.bind(this);
    this.updateAgentSnackbar = this.updateAgentSnackbar.bind(this);
    this.handleSnackbarClose = this.handleSnackbarClose.bind(this);
    this.toggleNodeSelector = this.toggleNodeSelector.bind(this);
    this.saveNewAgent = this.saveNewAgent.bind(this);
  }

  componentDidMount() {
    this.fetchAgents();
    this.fetchInputs();
    this.getAgentHeartbeatData();
  }

  async fetchAgents() {
    try {
      const response = await fetch(`${this.context.apiUrl}/agent`);
      const data = await response.json();

      // TODO: data structure should be data.agents
      //console.log(data);
      this.setState({
        agents: data,
        showInstallAgentDialog: (!data.length)
      });
    } catch (err) {
      // console.log(err);
    }
  }

  async fetchInputs() {
    try {
      const response = await fetch(`${this.context.apiUrl}/input`);
      const data = await response.json();

      // select all possible inputs for initial state
      let selectedInputs:string[] = [];
      data.inputs.forEach((input:InputRecord) => {
        selectedInputs.push(input.uuid);
      });

      this.setState({
        inputs: data.inputs,
        selectedInputs,
      })
    } catch (err) {
      // console.log(err);
    }
  }

  clipboardCopy() {
    this.setState({
      showClipboardSnackbar: true,
    });
  }

  updateAgentSnackbar() {
    this.setState({
      showSaveSnackbar: true,
    });
  }

  handleSnackbarClose() {
    this.setState({
      showClipboardSnackbar: false,
      showSaveSnackbar: false,
    });
  }

  async deleteAgent(agentId:string) {
    try {
      await fetch(`${this.context.apiUrl}/agent/${agentId}`, {
        method: 'delete',
      });
      this.fetchAgents();
      this.fetchInputs();
    } catch (err) {
      // console.log('CATCH ERR', error);
    }
  }

  handleChange(event:any) {
    const state:any = {};
    if (event.target.name.match(/^inputsource_/)) {
      const inputUuid = event.target.name.replace(/^inputsource_/, '');
      if (event.target.checked && !state.selectedInputs.includes(inputUuid)) {
        state.selectedInputs.push(inputUuid);
      }
      else {
        state.selectedInputs = state.selectedInputs.filter((uuid:string) => {
          return (uuid !== inputUuid)
        });
      }
    }
    else {
      state[event.target.name] = event.target.value;
    }

    this.setState(state);
  }

  static isIllegalName(name:string) {
    if (!name.match(/^[a-zA-Z0-9]([-a-zA-Z0-9]*[a-zA-Z0-9])?$/)) {
      return true;
    }
    return false;
  }

  static isIllegalPath(path:string) {
    if (!path.match(/(\/|\\)/)) {
      return true;
    }
    return false;
  }

  handleErrors(childState:any=null) {
    let errorsFound = false;
    const state:any = (childState) ? childState : this.state as any;

    const illegalCharJSX = (
      <Alert mb={4} severity="error">Kubernetes names must be no longer than 63 characters, must start and end with a lowercase letter or number, and may contain lowercase letters, numbers, and hyphens.</Alert>
    );

    const illegalPathJSX = (
      <Alert mb={4} severity="error">Invalid path</Alert>
    );

    const illegalNameJSX = (
      <Alert mb={4} severity="error">An Agent Name is required</Alert>
    );

    const fields = ['namespace'];
    if (state.useNodeSelector) {
      fields.push('nodeSelectorLabelKey');
      fields.push('nodeSelectorLabelValue');
    }
    state.errors.JSX = '';
    state.errors.agentName = false;
    state.errors.configPath = false;

    fields.forEach((f) => {
      state.errors[f] = false;

      if (Agents.isIllegalName(state[f])) {
        state.errors[f] = true;
        if (state[f]) {
          state.errors.JSX = illegalCharJSX;
        }
        errorsFound = true;
      }
    });

    if (Agents.isIllegalPath(state.configPath)) {
      state.errors.configPath = true;
      state.errors.JSX = illegalPathJSX;
      errorsFound = true;
    } else {
      state.errors.configPath = false;
    }

    if (!state.agentName) {
      errorsFound = true;
      state.errors.agentName = true;
      state.errors.JSX = illegalNameJSX;
    }

    this.setState(state);
    return errorsFound;
  }

  handleInstallAgent() {
    this.setState({
      showInstallAgentDialog: true,
      agentName: '',
      namespace: 'redactics',
      nodeSelector: '',
      useNodeSelector: false,
      configPath: '~/.redactics/values.yaml',
    })
  }

  handleClose() {
    this.setState({
      showInstallAgentDialog: false,
    });
  }

  toggleNodeSelector(event:any) {
    this.setState({
      useNodeSelector: event.target.checked,
    });
  }

  clipboardSnackbar() {
    return (
      <Snackbar
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={this.state.showClipboardSnackbar}
        autoHideDuration={8000}
        onClose={this.handleSnackbarClose}
        ContentProps={{
          'aria-describedby': 'message-id',
        }}
        message={<span id="message-id">This command has been copied to your clipboard</span>}
        action={[
          <IconButton
            key="close"
            aria-label="Close"
            color="inherit"
            onClick={this.handleSnackbarClose}
          >
            <CloseIcon />
          </IconButton>,
        ]}
      />
    );
  }

  saveSnackbar() {
    return (
      <Snackbar
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={this.state.showSaveSnackbar}
        autoHideDuration={8000}
        onClose={this.handleSnackbarClose}
        ContentProps={{
          'aria-describedby': 'message-id',
        }}
        message={<span id="message-id">Your changes have been saved</span>}
        action={[
          <IconButton
            key="close"
            aria-label="Close"
            color="inherit"
            onClick={this.handleSnackbarClose}
          >
            <CloseIcon />
          </IconButton>,
        ]}
      />
    );
  }


  async saveNewAgent() {
    const state:any = {};
    const nodeSelector = (this.state.useNodeSelector) ? `${this.state.nodeSelectorLabelKey}.${this.state.nodeSelectorLabelValue}` : '';
    const errorsFound = this.handleErrors();
    if (errorsFound) { return; }

    try {
      const response = await fetch(`${this.context.apiUrl}/agent`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: this.state.agentName,
          namespace: this.state.namespace,
          nodeSelector,
          configPath: this.state.configPath,
          inputs: this.state.selectedInputs,
        }),
      });

      this.fetchAgents();
      state.showInstallAgentDialog = false;

      this.setState(state);
    } catch (err) {
      // console.log(err);
    }
  }

  installAgent() {
    return (
      <React.Fragment>
        <Box>
          <p>Redactics requires installation of the Redactics Agent helm chart onto a Kubernetes cluster which has network access to your application database(s). The agent is used for carrying out the work in the workflows you&apos;ve defined here. Each Kubernetes cluster needs a single agent installed (a single agent can control multiple databases).</p>

          {this.state.illegalChars}
        </Box>

        {this.state.errors.JSX}

        <Box mt={2}>
          <FormControl fullWidth variant="outlined">
            <TextField
              error={this.state.errors.agentName}
              name="agentName"
              label="Agent Name"
              value={this.state.agentName}
              onChange={this.handleChange}
              InputProps={{
                endAdornment: <InputAdornment position="end"><Tooltip title="Unique name used to identify this agent (e.g. cluster or environment name)" placement="right-start"><HelpIcon /></Tooltip></InputAdornment>,
              }}
            />
          </FormControl>
        </Box>

        <Box mt={4}>
          <FormControl fullWidth variant="outlined">
            <TextField
              error={this.state.errors.namespace}
              name="namespace"
              label="Kubernetes Namespace"
              value={this.state.namespace}
              onChange={this.handleChange}
              InputProps={{
                endAdornment: <InputAdornment position="end"><Tooltip title="Kubernetes namespace used for the Redactics Agent" placement="right-start"><HelpIcon /></Tooltip></InputAdornment>,
              }}
            />
          </FormControl>
        </Box>

        <Box mt={4}>
          <FormControlLabel
            control={
              <Checkbox
                checked={this.state.useNodeSelector}
                onChange={this.toggleNodeSelector}
                name="useNodeSelector"
                color="primary"
              />
            }
            label="Assign Agent Pods to Specific Nodes (optional)"
          /> <Tooltip title="Optional Kubernetes nodeSelector label for Redactics Agent (allows prevent unwanted resource competition during export jobs), requires label key and value" placement="right-start"><HelpIcon /></Tooltip>
        </Box>

        <Box mt={4} display={(this.state.useNodeSelector) ? 'block' : 'none'}>
          <Box>
            <FormControl fullWidth variant="outlined">
              <TextField
                name="nodeSelectorLabelKey"
                label="Kubernetes Node Selector Label Key"
                value={this.state.nodeSelectorLabelKey}
                onChange={this.handleChange}
              />
            </FormControl>
          </Box>

          <Box mt={4}>
            <FormControl fullWidth variant="outlined">
              <TextField
                name="nodeSelectorLabelValue"
                label="Kubernetes Node Selector Label Value"
                value={this.state.nodeSelectorLabelValue}
                onChange={this.handleChange}
              />
            </FormControl>
          </Box>
        </Box>

        <Box mt={4}>
          <FormControl fullWidth variant="outlined">
            <TextField
              error={this.state.errors.configPath}
              name="configPath"
              label="Local Helm Config Path"
              value={this.state.configPath}
              onChange={this.handleChange}
              InputProps={{
                endAdornment: <InputAdornment position="end"><Tooltip title="Path to where you would like to save your Helm configuration file" placement="right-start"><HelpIcon /></Tooltip></InputAdornment>,
              }}
            />
          </FormControl>
        </Box>

        <Box mt={8}>
          <Typography variant="h4">
            Input Sources
          </Typography>

          <Box mt={2}>
            <Typography>
              Use the following Input Sources with this Agent:
            </Typography>

            {this.state.inputs.map((input:InputRecord) => (
              <FormControlLabel
                key={input.uuid}
                control={
                  <Checkbox
                    name={("inputsource_" + input.uuid)}
                    color="primary"
                    onChange={this.handleChange}
                    checked={this.state.selectedInputs.includes(input.uuid)}
                  />
                }
                label={input.inputName}
              />
            ))}
          </Box>
        </Box>

        <DialogActions>
          <Button color="secondary" variant="contained" onClick={this.saveNewAgent}>
            Save&nbsp;<SaveIcon />
          </Button>
        </DialogActions>
      </React.Fragment>
    )
  }

  /* eslint-disable max-len */
  /* eslint-disable no-restricted-syntax */

  getAgentHeartbeatData() {
    // const notifications = ref(fbDatabase, `notifications/${this.context.companyId}`);
    // onValue(notifications, (snapshot) => {
    //   const data = snapshot.val();
    //   if (!data) { return; }

    //   for (const [key, v] of Object.entries(data)) {
    //     // cast Firebase data to AgentFirebaseRecord type
    //     const val:AgentFirebaseRecord = v as AgentFirebaseRecord;
    //     if (key && (val.firstHeartbeat || val.heartbeat)) {
    //       const agents = this.state.agents.map((c:AgentRecord) => {
    //         const agent = c;
    //         if (agent.uuid === val.agentId) {
    //           if (val.firstHeartbeat && val.timestamp) {
    //             agent.agentInstallationDate = new Date(val.timestamp).toISOString();
    //             //agent.agentInstallationDate = "";
    //           } else if (val.heartbeat && val.timestamp) {
    //             agent.lastHeartBeatDate = new Date(val.timestamp).toISOString();
    //           }
    //         }

    //         return agent;
    //       });

    //       this.setState({
    //         agents,
    //       });
    //     }
    //   }
    // });
  }

  render() {
    /* eslint-disable no-restricted-syntax */

    return (
      <React.Fragment>
        <Dialog
          open={this.state.showInstallAgentDialog}
          onClose={this.handleClose}
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
          maxWidth={this.state.configMaxWidth}
        >
          <DialogTitle id="dialog-title">Configure Your Redactics Agent</DialogTitle>
          <DialogContent>
            {this.installAgent()}
          </DialogContent>
        </Dialog>

        {this.clipboardSnackbar()}
        {this.saveSnackbar()}

        <Helmet title="Agents" />

        <Typography variant="h1" gutterBottom display="inline">
          Agents
        </Typography>

        <Divider my={6} />

        <Box mt={4}>
          <Typography variant="body1" gutterBottom>
            Install the Redactics Agent adjacent to your input sources using the provided configuration and install command.
          </Typography>
        </Box>

        <Box mt={8}>
          <Grid
            justify="space-between"
            container
            spacing={10}
          >
            <Grid item xs={1} mb={6}>

            </Grid>

            <Grid item>
              <Box mb={4}>
                <Button variant="contained" color="secondary" size="small" onClick={this.handleInstallAgent}>
                  <AddIcon />
                  Install New Agent
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {this.state.agents.map((agent:AgentRecord) => <Agent
          clipboardCopy={this.clipboardCopy}
          updateAgentSnackbar={this.updateAgentSnackbar}
          handleSnackbarClose={this.handleSnackbarClose}
          deleteAgent={this.deleteAgent}
          agent={agent}
          inputs={this.state.inputs}
          key={agent.uuid}
          useNodeSelector={(agent.nodeSelector) ? true : false}
          handleErrors={this.handleErrors}
          errors={this.state.errors}
        />)}
      </React.Fragment>
    );
  }
}

export default Agents;

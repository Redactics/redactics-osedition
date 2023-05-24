import React from 'react';
import styled from 'styled-components';

import { green, red } from '@material-ui/core/colors';
import Moment from 'react-moment';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { withStyles } from '@material-ui/core/styles';

import {
  Card as MuiCard,
  CardContent,
  FormControl as MuiFormControl,
  Grid as MuiGrid,
  Typography,
  Button as MuiButton,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  ExpansionPanel,
  ExpansionPanelSummary,
  ExpansionPanelDetails as MuiExpansionPanelDetails,
  Paper,
  TextField,
  InputAdornment,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@material-ui/core';

import {
  Check as CheckIcon,
  Warning as WarningIcon,
  DeleteOutline as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpIcon,
} from '@material-ui/icons';

import {
  Clipboard as ClipboardIcon,
  Save as SaveIcon,
} from 'react-feather';

import { spacing } from '@material-ui/system';

import { HelmCmdHistory, InputRecord, AgentRecord } from '../../types/redactics';
import RedacticsContext from '../../contexts/RedacticsContext';

const Card = styled(MuiCard)(spacing);

const FormControlSpacing = styled(MuiFormControl)(spacing);

const FormControl = styled(FormControlSpacing)`
  min-width: 300px;
  max-width: 300px;
`;

const ExpansionPanelDetails = withStyles({
  root: {
    display: 'block',
  },
})(MuiExpansionPanelDetails);

const Grid = styled(MuiGrid)(spacing);

const Button = styled(MuiButton)(spacing);

interface IProps {
  agent: AgentRecord;
  inputs: InputRecord[];
  deleteAgent: any;
  clipboardCopy: any;
  updateAgentSnackbar: any;
  handleSnackbarClose: any;
  useNodeSelector: boolean;
  handleErrors: any;
  errors: any;
}

interface IState {
  saveButtonDisabled: boolean;
  helmCmd: any;
  helmCmdHistory: HelmCmdHistory[];
  selectedHelmCmd: string;
  deleteAgent: boolean;
  verboseSelected: boolean;
  helmConfig: string;
  sslSecrets: string[];
  errors: any;
  agent: any;
  selectedInputs: string[];
  showTLSInstructions: boolean;
  agentName: string;
  namespace: string;
  configPath: string;
  useNodeSelector: boolean;
  nodeSelectorLabelKey: string;
  nodeSelectorLabelValue: string;
}

class Agent extends React.Component<IProps, IState> {
  static contextType = RedacticsContext;

  constructor(props: IProps) {
    super(props);

    let showTLSInstructions = false;
    if (this.props.agent.inputs) {
      this.props.inputs.forEach((input:InputRecord) => {
        if (input.enableSSL && this.props.agent.inputs?.includes(input.uuid)) {
          showTLSInstructions = true;
        }
      })
    }

    this.state = {
      saveButtonDisabled: true,
      helmCmd: '',
      helmCmdHistory: [],
      selectedHelmCmd: '',
      deleteAgent: false,
      verboseSelected: false,
      helmConfig: '',
      sslSecrets: [],
      errors: {
        agentName: false,
        namespace: false,
        configPath: false,
      },
      agent: this.props.agent,
      agentName: this.props.agent.name || "",
      namespace: this.props.agent.namespace || "",
      configPath: this.props.agent.configPath || "",
      useNodeSelector: this.props.useNodeSelector,
      selectedInputs: this.props.agent.inputs || [],
      showTLSInstructions: showTLSInstructions,
      nodeSelectorLabelKey: (this.props.useNodeSelector) ? this.props.agent.nodeSelector.split('.')[0] : "",
      nodeSelectorLabelValue: (this.props.useNodeSelector) ? this.props.agent.nodeSelector.split('.')[1] : "",
    };

    this.handleChange = this.handleChange.bind(this);
    //this.handleHelmCmd = this.handleHelmCmd.bind(this);
    this.setSaveButtonDisabled = this.setSaveButtonDisabled.bind(this);
    this.toggleNodeSelector = this.toggleNodeSelector.bind(this);
    this.deleteAgent = this.deleteAgent.bind(this);
    this.updateAgent = this.updateAgent.bind(this);
    this.deleteAgentConfirm = this.deleteAgentConfirm.bind(this);
    this.closeDeleteAgent = this.closeDeleteAgent.bind(this);
  }

  async componentDidMount() {
    try {
      const response = await fetch(`${this.context.apiUrl}/agent/${this.props.agent.uuid}/helmCmd`);
      const data = await response.json();

      const { helmCmd } = data;
      const { helmCmdHistory } = data;

      const helmConfigResponse = await fetch(`${this.context.apiUrl}/agent/${this.props.agent.uuid}/helmConfig`);

      const helmData = await helmConfigResponse.json();
      const { helmConfig, sslSecrets } = helmData;

      this.setSaveButtonDisabled();

      this.setState({
        helmCmd,
        helmConfig,
        sslSecrets,
        helmCmdHistory,
        selectedHelmCmd: helmCmdHistory.length ? helmCmdHistory[0].uuid : '',
      });
    } catch (err) {
      // console.log('CATCH ERR', error);
    }
  }

  statusIcon() {
    return this.props.agent.agentInstallationDate
      ? <CheckIcon style={{ color: green[500], fontSize: 50 }} />
      : <WarningIcon style={{ color: red[500], fontSize: 50 }} />;
  }

  setSaveButtonDisabled() {
    this.setState({
      saveButtonDisabled: !((this.state.agentName && this.state.namespace && this.state.configPath)),
    });
  }

  handleChange(event:any) {
    const state:any = {
      selectedInputs: this.state.selectedInputs
    };
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
    this.setState(state, () => {
      this.setSaveButtonDisabled();
    });
  }

  // TODO: for embedded Helm config feature
  // handleHelmCmd(event:any) {
  //   // find helm command
  //   const helmCmd = this.state.helmCmdHistory.filter((c:HelmCmdHistory) => {
  //     if (c.uuid === event.target.value) {
  //       return c;
  //     }

  //     return false;
  //   });

  //   this.setState({
  //     selectedHelmCmd: event.target.value,
  //     helmCmd: helmCmd[0].cmd,
  //     verboseSelected: false,
  //   });
  // }

  deleteAgent() {
    this.setState({
      deleteAgent: true,
    });
  }

  async deleteAgentConfirm() {
    await this.props.deleteAgent(this.props.agent.uuid);

    this.setState({
      deleteAgent: false,
    });
  }

  closeDeleteAgent() {
    this.setState({
      deleteAgent: false,
    });
  }

  /* eslint-disable max-len */

  renderDeleteAgent() {
    const uninstallCmd = `helm uninstall -n ${this.state.namespace} redactics`;

    return (
      <Box mt={4}>
        <Grid
          container
          justify="space-between"
          mt={12}
        >
          <Grid item xs={10}>
          </Grid>
          <Grid item>
            <Button variant="contained" color="default" size="small" onClick={this.deleteAgent}>
              <DeleteIcon />&nbsp;
              Delete Agent
            </Button>
          </Grid>
        </Grid>
        <Dialog
          open={this.state.deleteAgent}
          onClose={this.closeDeleteAgent}
          aria-labelledby="delete-agent-title"
          aria-describedby="legend-description"
        >
          <DialogTitle id="delete-agent-title">Delete This Agent?</DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-agent-description">
              Clicking <b>Delete</b> will delete the settings for this agent, but to remove this agent from your cluster locally, please enter the following (assuming this namespace contains only Redactics configurations). Any workflows associated with this agent will need to be reassigned to a new agent for the config to be put to use.

              <Box mt={4}>
                <CopyToClipboard text={uninstallCmd} onCopy={this.props.clipboardCopy}>
                  <Button variant="outlined" size="small" color="secondary"><ClipboardIcon /></Button>
                </CopyToClipboard>
                <pre>
                  {uninstallCmd}
                </pre>
              </Box>
            </DialogContentText>

            <Box mt={4}>
              <DialogActions>
                <Button onClick={this.closeDeleteAgent}>
                  Cancel
                </Button>
                <Button color="secondary" onClick={this.deleteAgentConfirm}>
                  Delete
                </Button>
              </DialogActions>
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    );
  }

  toggleNodeSelector(event:any) {
    this.setState({
      useNodeSelector: event.target.checked,
    });
  }

  async updateAgent() {
    const state:any = {};
    const agentId = this.state.agent.uuid;
    const nodeSelector = (this.state.useNodeSelector) ? `${this.state.nodeSelectorLabelKey}.${this.state.nodeSelectorLabelValue}` : '';
    const errorsFound = this.props.handleErrors({
      agentName: this.state.agentName,
      namespace: this.state.namespace,
      useNodeSelector: this.state.useNodeSelector,
      nodeSelectorLabelKey: this.state.nodeSelectorLabelKey,
      nodeSelectorLabelValue: this.state.nodeSelectorLabelValue,
      configPath: this.state.configPath,
      errors: this.state.errors,
    });
    if (errorsFound) { return; }

    try {
      await fetch(`${this.context.apiUrl}/agent/${agentId}`, {
        method: 'put',
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

      // refresh helm config
      const refreshHelmCmd = await fetch(`${this.context.apiUrl}/agent/${agentId}/helmCmd`);
      const helmData = await refreshHelmCmd.json();
      const { helmCmd, helmCmdHistory } = helmData;

      state.helmCmd = helmCmd;
      state.helmCmdHistory = helmCmdHistory;
      this.props.updateAgentSnackbar();

      this.setState(state);
    } catch (err) {
      // console.log(err);
    }
  }

  displayAgentStatus() {
    if (this.props.agent.agentInstallationDate) {
      const lastHeartBeatDate = this.props.agent.lastHeartBeatDate ? (
        <div>
          Last configuration update date: <b><Moment fromNow>{new Date(this.props.agent.lastHeartBeatDate)}</Moment></b>
        </div>
      ) : '';
  
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Redactics Agent Info
          </Typography>
          <Box mt={2}>
            <div>
              Version: <b>{this.props.agent.lastAgentVersion}</b>
            </div>
            <div>
              Initial installation date: <b><Moment fromNow>{new Date(this.props.agent.agentInstallationDate)}</Moment></b>
            </div>
            {lastHeartBeatDate}
          </Box>
        </Box>
      )
    }
    else {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Awaiting Agent Reporting...
          </Typography>
        </Box>
      )
    }
  }

  agentInfo() {
    return (
      <React.Fragment>
        {this.displayAgentStatus()}
        
        <Box mt={4}>
          <Paper variant="outlined">
            <ExpansionPanel>
              <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Agent Settings</Typography>
              </ExpansionPanelSummary>
              <ExpansionPanelDetails>
                {this.props.errors.JSX}

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
                        error={this.state.errors.nodeSelectorLabelKey}
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
                        error={this.state.errors.nodeSelectorLabelValue}
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
                    Data Sources
                  </Typography>

                  <Box mt={2}>
                    <Typography>
                      Use the following Data Sources with this Agent:
                    </Typography>

                    {this.props.inputs.map((input:InputRecord) => (
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

                <Box mt={8}>
                  <Button color="secondary" variant="contained"  disabled={this.state.saveButtonDisabled} onClick={this.updateAgent}>
                    <SaveIcon />&nbsp;Save Changes
                  </Button>
                </Box>

              </ExpansionPanelDetails>
            </ExpansionPanel>
          </Paper>
        </Box>

        <Box mt={4} display={(this.state.showTLSInstructions) ? "block" : "none"}>
          <Paper variant="outlined">
            <ExpansionPanel>
              <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Agent TLS/SSL Input Setup Instructions</Typography>
              </ExpansionPanelSummary>
              <ExpansionPanelDetails>
                Enabling TLS/SSL encryption with your connectivity to your input sources requires performing the following steps. These steps (even upon completion) will remain available here for reference:

                <ol>
                  <li>Figure out whether your database requires presenting only the root CA certificate, or the root CA as well as client cert and key files. Download these required files.</li>
                  <li>Create a Kubernetes secret containing the certificates required by your database using the commands required below. Adjust the file paths to your downloaded certificates, and take out the <code>sslcert</code> and <code>sslkey</code> params if your server doesn&apos;t require access to these.</li>
                </ol>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Input Source</TableCell>
                      <TableCell>Secret Creation Command</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                  {this.state.sslSecrets.map((secret:any, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{secret.inputSource}</TableCell>
                      <TableCell>{secret.cmd}</TableCell>
                      <TableCell>
                        <CopyToClipboard text={secret.cmd} onCopy={this.props.clipboardCopy}>
                          <Button variant="outlined" size="small" color="secondary"><ClipboardIcon /></Button>
                        </CopyToClipboard>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </ExpansionPanelDetails>
            </ExpansionPanel>
          </Paper>
        </Box>
        
        <Box mt={4}>
          <Paper variant="outlined">
            <ExpansionPanel>
              <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Agent Config File</Typography>
              </ExpansionPanelSummary>
              <ExpansionPanelDetails>
                <p>
                  Please copy and paste this helm configuration file to <b>{this.state.configPath}</b>, and change all of the <b>changemes</b> in this file to real values. This configuration file will be automatically regenerated as you add/remove database inputs from your workflows, at which time you'll have to update this file with the provided updated configuration.
                </p>

                <Box mt={8}>
                  <CopyToClipboard text={this.state.helmConfig} onCopy={this.props.clipboardCopy}>
                    <Button variant="outlined" size="small" color="secondary"><ClipboardIcon /></Button>
                  </CopyToClipboard>
                </Box>

                <Box mt={2}>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {this.state.helmConfig}
                  </pre>
                </Box>
              </ExpansionPanelDetails>
            </ExpansionPanel>
          </Paper>
        </Box>

        <Box mt={4}>
          <Paper variant="outlined">
            <ExpansionPanel defaultExpanded>
              <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Agent Helm Upgrade/Install Command</Typography>
              </ExpansionPanelSummary>
              <ExpansionPanelDetails>
                <Box mt={2}>
                  <CopyToClipboard text={this.state.helmCmd.replace(/\\n/g, '\n')} onCopy={this.props.clipboardCopy}>
                    <Button variant="outlined" size="small" color="secondary"><ClipboardIcon /></Button>
                  </CopyToClipboard>
                </Box>

                <pre style={{ whiteSpace: 'normal' }}>
                  {this.state.helmCmd.split('\\n').map((item:string, key:string) => (key
                    ? (
                        <span key={key} style={{ wordBreak: 'break-all', paddingLeft: '15px' }}>
                          {item}
                          <br/>
                        </span>
                    )
                    : (
                        <span key={key} style={{ wordBreak: 'break-all' }}>
                          {item}
                          <br/>
                        </span>
                    )))}
                </pre>
              </ExpansionPanelDetails>
            </ExpansionPanel>
          </Paper>
        </Box>
      </React.Fragment>
    );
  }

  render() {
    return (
      <Card mb={6}>
        <CardContent>
          <Grid
            justify="space-between"
            container
            spacing={10}
          >

            <Grid item xs={1}>
              {this.statusIcon()}
            </Grid>

            <Grid item xs={11}>
              <Typography variant="h4">
                {this.state.agentName} <code>({this.props.agent.uuid})</code>
              </Typography>

              <Box mt={4}>
                {this.agentInfo()}
              </Box>

              {this.renderDeleteAgent()}
            </Grid>

          </Grid>
        </CardContent>
      </Card>
    );
  }
}

export default Agent;

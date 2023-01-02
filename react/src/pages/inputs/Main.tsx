import React from 'react';
import styled, { withTheme } from 'styled-components';
import { withStyles } from '@material-ui/core/styles';

import Helmet from 'react-helmet';

// import { red, green, blue } from "@material-ui/core/colors";

import {
  Divider as MuiDivider,
  Typography,
  Button as MuiButton,
  Box,
  CardContent,
  Card as MuiCard,
  Link,
  Grid,
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
  FormControlLabel,
  Checkbox,
  Paper,
  TextField as MuiTextField,
  InputAdornment,
  Tooltip,
  FormControl as MuiFormControl,
  InputLabel,
  Select,
  MenuItem,
  ExpansionPanel,
  ExpansionPanelSummary,
  ExpansionPanelDetails as MuiExpansionPanelDetails,
  Snackbar,
  IconButton,
} from '@material-ui/core';

import {
  Add as AddIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  HelpOutline as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
} from '@material-ui/icons';

import {
  Save as SaveIcon,
} from 'react-feather';

import {
  InputRecord,
} from '../../types/redactics';

import { Alert as MuiAlert } from '@material-ui/lab';

import { spacing } from '@material-ui/system';
import RedacticsContext from '../../contexts/RedacticsContext';

const Card = styled(MuiCard)(spacing);

const Divider = styled(MuiDivider)(spacing);

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

const ExpansionPanelDetails = withStyles({
  root: {
    display: 'block',
  },
})(MuiExpansionPanelDetails);

const NWTableCell = withStyles({
  root: {
    whiteSpace: 'nowrap',
  },
})(TableCell);

const Alert = styled(MuiAlert)(spacing);

const styles = {
  selectAdornment: {
    marginRight: '-30px',
  },
};

interface IProps {
  classes: any;
}

interface IState {
  inputs: InputRecord[];
  errors: any;
  input: InputRecord;
  editInputDialog: boolean;
  missingInput: boolean;
  newInputKey: number;
  saveButtonDisabled: boolean;
  showSnackbar: boolean;
}

class Inputs extends React.Component<IProps, IState> {
  static contextType = RedacticsContext;

  constructor(props:IProps) {
    super(props);

    this.refreshInputs = this.refreshInputs.bind(this);
    this.handleInputChanges = this.handleInputChanges.bind(this);
    this.inputDialog = this.inputDialog.bind(this);
    this.hideInputDialog = this.hideInputDialog.bind(this);
    this.saveInputChanges = this.saveInputChanges.bind(this);
    this.deleteInput = this.deleteInput.bind(this);
    this.saveChanges = this.saveChanges.bind(this);
    this.handleSnackbarClose = this.handleSnackbarClose.bind(this);

    this.state = {
      inputs: [],
      errors: {},
      input: {
        uuid: "",
        inputDisplayMode: "",
        inputType: "",
        inputName: "",
        exportData: true,
        diskSize: 0,
        enableSSL: false,
        sslMode: "prefer",
      },
      editInputDialog: false,
      missingInput: false,
      newInputKey: 0,
      saveButtonDisabled: true,
      showSnackbar: false,
    };
  }

  async componentDidMount() {
    this.refreshInputs();
  }

  async refreshInputs() {
    try {
      const response = await fetch(`${this.context.apiUrl}/input`, {
        credentials: 'include',
      });

      const data = await response.json();

      this.setState({
        inputs: data.inputs,
      })
    } catch (err) {
      console.log('CATCH ERR', err);
    }
  }

  handleInputChanges(event:any) {
    const state:any = this.state;
    state.input[event.target.name] = (event.target.name === "enableSSL" || event.target.name === "exportData") ? event.target.checked : event.target.value;
    this.setState(state);
  }

  inputDialog(input?:InputRecord) {
    if (input) {
      this.setState({
        input: {
          uuid: input.uuid,
          inputDisplayMode: "Edit",
          inputType: input.inputType,
          inputName: input.inputName,
          exportData: input.exportData,
          diskSize: input.diskSize,
          enableSSL: input.enableSSL,
          sslMode: input.sslMode,
        },
        editInputDialog: true,
      })
    }
    else {
      this.setState({
        input: {
          uuid: "new",
          inputDisplayMode: "Add",
          inputType: "",
          inputName: "",
          exportData: true,
          diskSize: 20,
          enableSSL: false,
          sslMode: "prefer",
        },
        editInputDialog:true,
      })
    }
  }

  hideInputDialog() {
    this.setState({
      editInputDialog:false
    })
  }

  handleSnackbarClose() {
    this.setState({
      showSnackbar: false,
    });
  };

  editInputDialogContent() { 
    return (
      <Box>
        <Box mt={4}>
          {this.state.errors.JSX}

          <Box mt={4}>
            <FormControl fullWidth>
              <TextField
                error={this.state.errors.inputName}
                name="inputName"
                label="Input Name"
                value={this.state.input.inputName}
                onChange={(event) => this.handleInputChanges(event)}
                InputProps={{ endAdornment: <InputAdornment className={this.props.classes.selectAdornment} position="end"><Tooltip title="Arbitrary label for this input" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
              />
            </FormControl>

            <Box mt={4}>
              <FormControl fullWidth>
                <InputLabel htmlFor="inputType">Input/Database Type</InputLabel>
                <Select
                  error={this.state.errors.inputType}
                  name="inputType"
                  value={this.state.input.inputType}
                  onChange={(event) => this.handleInputChanges(event)}
                >
                  <MenuItem key="postgresql" value="postgresql">PostgreSQL</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box mt={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={this.state.input.exportData}
                    onChange={(event) => this.handleInputChanges(event)}
                    name="exportData"
                    color="primary"
                  />
                }
                label="Export data from this input source"
              />&nbsp;<Tooltip title="Checking this option means that you intend to export data from this input source, in which case temporary disk space will be required for this export (CSV) data" placement="right-start"><HelpIcon /></Tooltip>
            </Box>

            <Box mt={4} display={(this.state.input.exportData) ? 'block' : 'none'}>
              <FormControl fullWidth variant="outlined">
                <TextField
                  error={this.state.errors.diskSize}
                  name="diskSize"
                  label="Disk Space Allocation"
                  onChange={(event) => this.handleInputChanges(event)}
                  value={this.state.input.diskSize}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment className={this.props.classes.selectAdornment} position="end"><b>GB</b>&nbsp;&nbsp;<Tooltip title="Specify an adequate amount of disk space to allocate for this export (CSV) data. A persistent volume claim will be provisioned matching this file size. You can enlarge, but not shrink this disk space in the future." placement="right-start"><HelpIcon /></Tooltip></InputAdornment>,
                    inputProps: {
                      min:1
                    }
                  }}
                />
              </FormControl>
            </Box>

            <Box mt={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={this.state.input.enableSSL}
                    onChange={(event) => this.handleInputChanges(event)}
                    name="enableSSL"
                    color="primary"
                  />
                }
                label="Database Connectivity Should Be TLS/SSL Encrypted"
              />
            </Box>

            <Box mt={4} display={(this.state.input.enableSSL) ? 'block' : 'none'}>
              Be sure to follow the "TLS/SSL Certificate Setup Instructions" included in the Agents page to facilitate connectivity using your certificates.
              <Box mt={4}>
                <FormControl fullWidth>
                  <InputLabel htmlFor="sslMode">TLS/SSL Mode</InputLabel>
                  <Select
                    name="sslMode"
                    value={this.state.input.sslMode}
                    onChange={(event) => this.handleInputChanges(event)}
                  >
                    <MenuItem key="allow" value="allow">Allow</MenuItem>
                    <MenuItem key="prefer" value="prefer">Prefer</MenuItem>
                    <MenuItem key="require" value="require">Require</MenuItem>
                    <MenuItem key="verify-ca" value="verify-ca">Verify CA</MenuItem>
                    <MenuItem key="verify-full" value="verify-full">Verify Full</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* <Box mt={4} display={(!this.state.input.uuid.match(/^new/) && this.state.input.enableSSL) ? 'block' : 'none'}>
              <Paper variant="outlined">
                <ExpansionPanel>
                  <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>TLS/SSL Encryption Setup Instructions</Typography>
                  </ExpansionPanelSummary>
                  <ExpansionPanelDetails>
                    Enabling TLS/SSL encryption requires having an engineer perform the following four steps. These steps (even upon completion) will remain available here for reference:

                    <ol>
                      <li>Figure out what <code>sslmode</code> option is required by your database host/provider. Possibilities include <code>allow, prefer, require, verify-ca, verify-full</code> (<Link href="https://www.postgresql.org/docs/12/libpq-ssl.html" target="_blank">more info</Link>). Also figure out whether your database requires presenting only the root CA certificate, or the root CA as well as client cert and key files. Download these required files - we&apos;ll need them for step 3.</li>
                      <li>Update your Helm configuration file (i.e. <code>{this.getAgent().configPath}</code>) and add the following in the block (respecting proper indentation level) that includes <code>id: {this.props.input.uuid}</code>. Take out the <code>sslcert</code> and <code>sslkey</code> params if your server doesn&apos;t require these, and you can adjust the <code>sslmode</code> value as necessary:<br/><br/>
                        <code>
                          enableSSL: true<br/>
                          extra: &apos;&#123;&quot;sslmode&quot;:&quot;verify-ca&quot;, &quot;sslrootcert&quot;:&quot;/pgcerts/{this.props.input.uuid}/sslrootcert&quot;, &quot;sslcert&quot;: &quot;/pgcerts/{this.props.input.uuid}/sslcert&quot;, &quot;sslkey&quot;: &quot;/pgcerts/{this.props.input.uuid}/sslkey&quot;&#125;&apos;
                        </code><br/><br/>
                        If, for whatever reason, you&apos;d like to disable this TLS/SSL connectivity you can simply comment out these two lines by entering a hash (i.e. <code>#</code>) character before each line.
                      </li>
                      <li>Create a Kubernetes secret containing the certificates required by your database. Adjust the file paths, and take out the <code>sslcert</code> and <code>sslkey</code> params if your server doesn&apos;t require these:<br/><br/>
                        <code>
                          kubectl create secret -n {this.getAgent().namespace} generic pgcert-{this.props.input.uuid} --from-file=sslrootcert=/path/to/server-ca.pem --from-file=sslcert=/path/to/client-cert.pem  --from-file=sslkey=/path/to/client-key.pem
                        </code>
                      </li>
                      <li>Visit the Agent page and reapply the provided configuration to your cluster, which will update all agent database connections to use the updated configuration you&apos;ve provided in your Helm configuration file.</li>
                    </ol>
                  </ExpansionPanelDetails>
                </ExpansionPanel>
              </Paper>
            </Box> */}
          </Box>
        </Box>
      </Box>
    ) 
  }

  saveInputChanges() {
    const state:IState = this.state;
    let errorsFound:boolean = false;
    let inputs:InputRecord[] = this.state.inputs;

    if (!state.input.inputName) {
      state.errors.inputName = true;
      errorsFound = true;
    }
    else {
      state.errors.inputName = false;
    }

    if (!state.input.inputType) {
      state.errors.inputType = true;
      errorsFound = true;
    }
    else {
      state.errors.inputType = false;
    }

    if (errorsFound) {
      this.setState({
        errors: state.errors
      })
      return;
    }

    if (this.state.input.uuid === "new") {
      state.newInputKey++;
      state.input.uuid = "new" + state.newInputKey;

      inputs.push(state.input);
    }

    // find and update existing input in inputs listing
    let duplicateInputName:boolean = false;
    inputs = inputs.map((input) => {
      if (input.inputName === state.input.inputName && input.uuid !== state.input.uuid) {
        duplicateInputName = true;
      }
      else if (input.uuid === state.input.uuid) {
        input.inputName = state.input.inputName;
        input.inputType = state.input.inputType;
        input.diskSize = state.input.diskSize;
        input.enableSSL = state.input.enableSSL;
        input.sslMode = state.input.sslMode;
      }

      return input;
    });

    if (duplicateInputName) {
      state.errors.JSX = (
        <Alert mb={4} severity="error">Input names must be unique.</Alert>
      );

      this.setState({
        errors: state.errors
      })
      return;
    }

    state.errors.JSX = null;
    //console.log("INPUTS", inputs);
    //console.log("STATE", state)

    if (this.state.input.uuid.match(/^new/)) {
      this.setState({
        missingInput: false,
        errors: state.errors,
        editInputDialog: false,
        newInputKey: state.newInputKey,
        inputs: inputs,
        saveButtonDisabled: false,
      })
    }
    else {
      this.setState({
        missingInput: false,
        errors: state.errors,
        editInputDialog: false,
        inputs: inputs,
        saveButtonDisabled: false,
      })
    }
  }

  deleteInput(input:InputRecord) {
    const state:IState = this.state;

    const inputs = state.inputs.filter((i:InputRecord) => {
      return (i.uuid !== input.uuid)
    })

    this.setState({
      inputs: inputs,
      saveButtonDisabled: false,
    });
  }

  async saveChanges() {
    try {
      this.setState({
        saveButtonDisabled: true,
        errors: {},
      });

      const payload = {
        inputs: this.state.inputs,
      }

      await fetch(`${this.context.apiUrl}/input`, {
        method: 'put',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      this.setState({
        saveButtonDisabled: false,
        showSnackbar: true,
      });

      this.refreshInputs();

    } catch (err) {
      console.log('CATCH ERR', err);

      this.setState({
        saveButtonDisabled: false
      });
    }
  }

  /* eslint-disable max-len */

  render() {
    return (
      <React.Fragment>
        <Helmet title="Input Sources" />

        <Typography variant="h1" gutterBottom display="inline">
          Input Sources
        </Typography>

        <Divider my={6} />

        <Box mt={4}>
          <Typography variant="body1" gutterBottom>
            Define your input sources (i.e. databases, API inputs, etc.) here.
          </Typography>

          <Box mt={8}>
            <Grid
              justify="space-between"
              container
              spacing={10}
            >
              <Grid item></Grid>
              <Grid item>
                <div>
                  <Button variant="contained" color="secondary" size="small" onClick={() => this.inputDialog()}>
                    <AddIcon />&nbsp;
                    Add Input Source
                  </Button>
                </div>
              </Grid>
            </Grid>
          </Box>

          <Card mt={8}>
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Input Type</TableCell>
                    <TableCell>Disk Space Allocation</TableCell>
                    <TableCell>TLS/SSL Encrypted</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {this.state.inputs.map((input:InputRecord) => {
                    return (
                      <TableRow key={input.uuid}>
                        <TableCell>{(input.uuid.match(/^new/)) ? "" : input.uuid}</TableCell>
                        <TableCell>{input.inputName}</TableCell>
                        <TableCell>{input.inputType}</TableCell>
                        <TableCell>{(input.diskSize) ? input.diskSize + " GB" : "None"}</TableCell>
                        <TableCell>{(input.enableSSL) ? "yes" : "no"}</TableCell>
                        <NWTableCell>
                          <Button variant="contained" color="secondary" size="small" onClick={() => this.inputDialog(input)}>
                            <EditIcon/>&nbsp;Edit
                          </Button>&nbsp;
                          <Button variant="contained" color="default" size="small" onClick={() => this.deleteInput(input)}>
                            <DeleteIcon />&nbsp;Delete
                          </Button>
                        </NWTableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <Box mt={8}>
                <Grid
                  container
                  justify="space-between"
                >
                  <Grid item xs={10}>
                    <Button variant="contained" color="primary" size="large" disabled={this.state.saveButtonDisabled} onClick={() => this.saveChanges()}>
                      <SaveIcon />&nbsp;
                      Save Changes
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Dialog
          open={this.state.editInputDialog}
          onClose={this.hideInputDialog}
          maxWidth="md"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
          fullWidth
        >
          <DialogTitle id="dialog-title">{this.state.input.inputDisplayMode} Input Source</DialogTitle>
          <DialogContent>
            <DialogContentText id="dialog-description">
              {this.editInputDialogContent()}
            </DialogContentText>

            <DialogActions>
              <Button color="secondary" variant="contained" onClick={this.saveInputChanges}>
                {this.state.input.inputDisplayMode} Input
              </Button>
            </DialogActions>
          </DialogContent>
        </Dialog>

        <Snackbar
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={this.state.showSnackbar}
          autoHideDuration={8000}
          onClose={this.handleSnackbarClose}
          ContentProps={{
            'aria-describedby': 'message-id',
          }}
          message={<span id="message-id"><b>Your changes have been saved!</b></span>}
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

      </React.Fragment>
    );
  }
}

export default withStyles(styles)(Inputs);

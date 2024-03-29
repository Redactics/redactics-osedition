import React from 'react';
import styled from 'styled-components';
import { withStyles } from '@material-ui/core/styles';

import { spacing } from '@material-ui/system';

import {
  Grid as MuiGrid,
  Typography,
  TextField as MuiTextField,
  FormControl as MuiFormControl,
  Button as MuiButton,
  Box,
  Link,
  Checkbox,
  Tooltip,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper as MuiPaper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  ExpansionPanel,
  ExpansionPanelSummary,
  ExpansionPanelDetails as MuiExpansionPanelDetails,
  List,
  ListItem,
  ListItemText,
  Select,
  InputLabel,
  MenuItem,
  FormControlLabel,
} from '@material-ui/core';

import {
  Add as AddIcon,
  DeleteOutline as DeleteIcon,
  Edit as EditIcon,
  HelpOutline as HelpIcon,
  ExpandMore as ExpandMoreIcon,
} from '@material-ui/icons';

import {
  HardDrive as HardDriveIcon,
  Code as CodeIcon,
} from 'react-feather';

import { WorkflowInputRecord, InputRecord, CustomSecret, DataFeed, AgentRecord, WorkflowRecord, PostUpdateParam } from '../../types/redactics';

import { Alert as MuiAlert } from '@material-ui/lab';

const Grid = styled(MuiGrid)(spacing);

const TextFieldSpacing = styled(MuiTextField)(spacing);

const FormControlSpacing = styled(MuiFormControl)(spacing);

const FormControl = styled(FormControlSpacing)`
  min-width: 200px;
  max-width: 200px;
`;

const TextField = styled(TextFieldSpacing)`
  width: 200px;
`;

const MedTextField = styled(TextFieldSpacing)`
  width: 400px;
`;

const WideTextField = styled(TextFieldSpacing)`
  width: 600px;
`;

const bold = {
  fontWeight: "bold"
};

const Alert = styled(MuiAlert)(spacing);

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

const Paper = styled(MuiPaper)(spacing);

const Button = styled(MuiButton)(spacing);

/* eslint-disable @typescript-eslint/no-empty-interface */

interface IProps {
  inputs: WorkflowInputRecord[];
  handleDeleteSecret: any;
  agentNamespace?: string;
  dataFeeds: DataFeed[];
  dataFeed: DataFeed;
  hideDataFeed: any;
  addDataFeed: any;
  editDataFeed: boolean;
  addParameterValue: any;
  updateParameterValue: any;
  deleteParameterValue: any;
  handleDataFeed: any;
  handleDataFeedBack: any;
  handleDataFeedCancel: any;
  handleDataFeedOptions: any;
  saveDataFeedChanges: any;
  triggerEditDataFeed: any;
  deleteDataFeed: any;
  errors: any;
  handleCustomSecret: any;
  addSecret: any;
  agents: AgentRecord[];
  workflow: WorkflowRecord;
}

interface IState {

}

class WorkflowPostExport extends React.Component<IProps, IState> {
  /* eslint-disable max-len */

  databaseEngine(engine:string) {
    let displayEngine:string = "";
    switch (engine) {
      case 'postgresql':
        displayEngine = "PostgreSQL";
      break;

      default:
      break;
    }

    return displayEngine;
  }

  dataFeedName(df:string) {
    let dataFeed:string = "";
    switch (df) {
      case 'digitalTwin':
        dataFeed = "Create a PII-free Digital Twin/Clone";
      break;
      
      case 's3upload':
        dataFeed = "Upload/Sync Data to an Amazon S3 bucket";
      break;

      case 'custom':
        dataFeed = "Custom Container/Plugin";
      break;

      default:
      break;
    }

    return dataFeed;
  }

  dataFeedSummary(df:any) {
    let dataFeedSummary:string = "";
    let uploadBucket:string = df.dataFeedConfig.S3UploadBucket;
    if (df.dataFeedConfig.S3UploadBucket && !df.dataFeedConfig.S3UploadBucket.match(/^s3:\/\//)) {
      uploadBucket = "s3://" + df.dataFeedConfig.S3UploadBucket;
    }
    switch (df.dataFeed) {
      case 'digitalTwin':
      dataFeedSummary = "Data will be cloned to your " + this.databaseEngine(df.dataFeedConfig.databaseEngine) + " database and will be ";
      dataFeedSummary += (df.dataFeedConfig.enableDeltaUpdates) ? "updated with new data" : "reset to match the original data";
      if (df.dataFeedConfig.enablePostUpdatePreparedStatements) {
        let preparedStatementValues:string[] = [];
        df.dataFeedConfig.postUpdateKeyValues.forEach((kv:PostUpdateParam) => {
          if (kv.key && kv.value) {
            preparedStatementValues.push(kv.value);
          }
        })
        if (preparedStatementValues.length) {
          dataFeedSummary+= ". After each time the workflow runs your data will be modified with the following values: " + preparedStatementValues.join(', ') + ".";
        }
      }
      break;
      
      case 's3upload':
      dataFeedSummary = "Upload tables to " + uploadBucket;
      break;

      case 'custom':
      dataFeedSummary = "Invoke custom container " + df.dataFeedConfig.image + ":" + df.dataFeedConfig.tag;
      break;

      default:
      break;
    }

    return dataFeedSummary;
  }

  outputTable() {
    if (this.props.dataFeeds && this.props.dataFeeds.length) {
      return (
        <Box>
          <Grid
            justify="space-between"
            container
            spacing={10}
          >
            <Grid item></Grid>
            <Grid item mb={6}>
              <Button variant="contained" color="secondary" size="small" onClick={this.props.addDataFeed}>
                <AddIcon />&nbsp;
                Add Data Feed
              </Button>
            </Grid>
          </Grid>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data Feed</TableCell>
                <TableCell>Summary</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {this.props.dataFeeds.map((df:DataFeed) => (
                <TableRow key={df.uuid}>
                  <TableCell>{this.dataFeedName(df.dataFeed)}</TableCell>
                  <TableCell>{this.dataFeedSummary(df)}</TableCell>
                  <NWTableCell>
                    <Button variant="contained" color="secondary" size="small" onClick={() => this.props.triggerEditDataFeed(df)}>
                      <EditIcon/>&nbsp;Edit
                    </Button>&nbsp;
                    <Button variant="contained" color="default" size="small" onClick={() => this.props.deleteDataFeed(df)}>
                      <DeleteIcon />&nbsp;Delete
                    </Button>
                  </NWTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )
    }
    else {
      return (
        <Box>
          <Button variant="contained" color="secondary" size="small" onClick={this.props.addDataFeed}>
            <AddIcon />&nbsp;
            Add Data Feed
          </Button>
        </Box>
      )
    }
  }

  showErrors() {
    if (this.props.errors.duplicateDataFeed) {
      return (
        <Alert mb={4} severity="error">You can only create one of each type of Data Feed</Alert>
      )
    }
    else if (this.props.errors.invalidBucketName) {
      return (
        <Alert mb={4} severity="error">Invalid Amazon S3 bucket name. <Link target="_blank" href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html">Naming guidelines</Link></Alert>
      )
    }
    else if (this.props.errors.invalidPostUpdateKeyValues) {
      return (
        <Alert mb={4} severity="error">Invalid parameter key or value. Parameters must not be empty and must not contain %, (, or ) characters</Alert>
      )
    }
    else if (this.props.errors.invalidSecret) {
      return (
        <Alert mb={4} severity="error">One or more of your secrets is missing a value - all fields are required</Alert>
      )
    }
    return null;
  }

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

  render() {
    const namespaceTip = this.props.dataFeed.feedSecrets.length ? (
      <p>
        Be sure that any secrets that need to be attached to your post-processing Docker container exist in this same Kubernetes namespace.
      </p>
    ) : '';

    return (
      <React.Fragment>
        <Box mt={8}>
          <Typography variant="h4" gutterBottom>
            Data Feeds
          </Typography>

          <Dialog
            open={this.props.editDataFeed}
            onClose={this.props.hideDataFeed}
            fullWidth
            maxWidth="md"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
          >
            <DialogTitle id="dialog-title">{(!this.props.dataFeed.uuid.match(/^new/)) ? "Edit" : "Add"} Data Feed</DialogTitle>
            <DialogContent>
              <DialogContentText id="dialog-description">
                {this.showErrors()}

                <Box display={(this.props.dataFeed.dataFeed === '') ? 'block' : 'none'}>
                  <List component="nav" aria-label="data feed selection">
                    <ListItem disabled={!(this.props.workflow.workflowType === "ERL")} button onClick={() => this.props.handleDataFeed('digitalTwin')}>
                      <ListItemText
                        primary="Create a PII-free Digital Twin/Clone"
                        primaryTypographyProps={{ style: bold }}
                        secondary="Creates a PII-free clone of your data to a target/output database. Any data written in the target tables is replaced by the data from your source/input." 
                      />
                    </ListItem>

                    <ListItem disabled={!(this.props.workflow.workflowType === "ERL")} button onClick={() => this.props.handleDataFeed('s3upload')}>
                      <ListItemText
                        primary="Upload/Sync Data to an Amazon S3 Bucket"
                        primaryTypographyProps={{ style: bold }}
                        secondary="Upload your table data CSV files to an Amazon S3 bucket." 
                      />
                    </ListItem>

                    <ListItem disabled={!(this.props.workflow.workflowType === "ERL")} button onClick={() => this.props.handleDataFeed('custom')}>
                      <ListItemText
                        primary="Configure a Custom Container/Plugin"
                        primaryTypographyProps={{ style: bold }}
                        secondary="Trigger your own custom container to carry out work of your choosing." 
                      />
                    </ListItem>
                  </List>
                </Box>

                <Box mt={8} display={(this.props.dataFeed.dataFeed === 'digitalTwin') ? 'block' : 'none'}>
                  <Typography variant="h4" gutterBottom>
                    Digital Twin Options
                  </Typography>

                  <p>Adding this data feed will require updating your Agent configuration file (provided within the <Link href="/agents" target="_blank">Agents</Link> page), replacing the "changeme"s for connection ID <code>{this.props.dataFeed.uuid}</code> with the specified connection info for this data source.</p>

                  <p><b>This feature does not prevent you from accidentally destroying data by selecting the wrong output destination!</b> Your output destination will be populated with the entire public schema, the schema of your selected tables from your data source, and the table data from your selected tables. We strongly advise that your output destination be an empty/unused database (you can create a new database with the <code>create database</code> SQL command) in order to avoid collisions and unintended overwriting.</p>

                  <Box mt={4}>
                    <FormControl margin="dense" fullWidth>
                      <InputLabel>
                        Output Destination
                      </InputLabel>
                      <Select
                        value={this.props.dataFeed.dataFeedConfig.inputSource}
                        name="inputSource"
                        onChange={(event) => this.props.handleDataFeedOptions(event)}
                      >
                        {this.props.workflow.allOutputs.map((input:InputRecord) => (
                          <MenuItem key={input.uuid} value={input.uuid}>{input.inputName}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                 
                  <Box mt={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={this.props.dataFeed.dataFeedConfig.enableDeltaUpdates}
                          onChange={(event) => this.props.handleDataFeedOptions(event)}
                          name="enableDeltaUpdates"
                          color="primary"
                        />
                      }
                      label="Enable Delta Updates"
                    />
                    <Box>
                      After your initial job has run your workflow performance can be increased substantially by only transferring changed data, rather than recreating tables from scratch. Leave this disabled to hard-reset your data each time your workflow runs.
                    </Box>
                  </Box>

                  <Box mt={4} display={(this.props.dataFeed.dataFeedConfig.enableDeltaUpdates) ? 'block' : 'none'}>
                    <FormControl fullWidth>
                      <TextField
                        error={this.props.errors.invalidDeltaUpdateField}
                        name="deltaUpdateField"
                        value={this.props.dataFeed.dataFeedConfig.deltaUpdateField}
                        onChange={(event) => this.props.handleDataFeedOptions(event)}
                        label="Updated Date Field Name"
                        InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Field name in your table that contains the timestamp tracking the last updated date, e.g. &quot;updated_at&quot;" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                      />
                    </FormControl>
                  </Box>

                  <Box mt={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={this.props.dataFeed.dataFeedConfig.enablePostUpdatePreparedStatements}
                          onChange={(event) => this.props.handleDataFeedOptions(event)}
                          name="enablePostUpdatePreparedStatements"
                          color="primary"
                        />
                      }
                      label="Enable Custom Data Updates"
                    />
                    <Box>
                      Run custom SQL commands after your workflows run to make custom updates to your data. One use case for this is personalizing demos (e.g. to specify the name and logo of the company you are demoing to). To do so, you'll need to define a prepared SQL statement (i.e. an SQL command supporting parameters), as well as the values for these parameters.
                    </Box>

                    <Box mt={4} display={(this.props.dataFeed.dataFeedConfig.enablePostUpdatePreparedStatements) ? 'block' : 'none'}>
                      <Box>
                        As an example, in <code>UPDATE company SET name=%(company_name)s, logo=%(logo)s WHERE source_primary_key=%(company_id)s</code>, the three parameters in this prepared SQL statement are <code>company_name</code>, <code>logo</code>, and <code>company_id</code>. See below for the instructions for defining your prepared statements, and click on the <b>Add Parameter Value</b> button below these instructions to define the key/value pairs for each parameter in your prepared statement(s). For example, for the company_name parameter your parameter key would be <code>company_name</code>, and your parameter value: <code>Company we are demoing to</code>.
                      </Box>

                      <Box mt={4}>
                        <Paper variant="outlined">
                          <ExpansionPanel>
                            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography>Prepared Statement Setup Instructions</Typography>
                            </ExpansionPanelSummary>
                            <ExpansionPanelDetails>
                              <Box>
                                Prepared statements are SQL commands saved as Kubernetes secrets. Here is an example prepared statement: <code>UPDATE company SET name=%(name)s, logo=%(logo)s WHERE source_primary_key=%(company_id)s</code>. In this example <code>name</code>, <code>logo</code> and <code>company_id</code> are placeholder parameters requiring values, which you'll set below. Parameter key/value pairs are required rather than entire SQL commands for security reasons, and to make it easy for anybody in your company to change these values without running the risk of corrupting your data. To create this secret as per this example:<br/><br/>
                                <code>kubectl create secret -n {this.getAgent().namespace} generic digital-twin --from-literal=prepared-statements="UPDATE company SET name=%(name)s, logo=%(logo)s WHERE source_primary_key=%(company_id)s;"</code><br/><br/>
                                Create your own prepared statements by replacing what is quoted here.<br/><br/>Multiple SQL commands are supported, separated by semicolons, and please note that the format of <code>%(your_variable)s</code> is required for all variable types (including non-strings) - the correct type will be automatically cast. All paraemters require that a value is provided.
                              </Box>
                            </ExpansionPanelDetails>
                          </ExpansionPanel>
                        </Paper>
                      </Box>

                      <Box mt={4}>
                        <Table size="small" style={{ width: 'auto' }}>
                          <TableBody>
                            {this.props.dataFeed.dataFeedConfig.postUpdateKeyValues.map((kv:PostUpdateParam, idx:number) => (
                              <TableRow key={idx}>
                                <TableCell style={{ paddingLeft: 0 }}>
                                  <FormControl>
                                    <TextField
                                      variant="outlined"
                                      margin="dense"
                                      name="parameterKey"
                                      value={kv.key}
                                      onChange={(event) => this.props.updateParameterValue(idx, event)}
                                      label="Parameter Key"
                                    />
                                  </FormControl>
                                </TableCell>
                                <TableCell>
                                  <FormControl>
                                    <TextField
                                      variant="outlined"
                                      margin="dense"
                                      name="parameterValue"
                                      value={kv.value}
                                      onChange={(event) => this.props.updateParameterValue(idx, event)}
                                      label="Parameter Value"
                                    />
                                  </FormControl>
                                </TableCell>
                                <TableCell>
                                  <Button variant="contained" color="secondary" size="small" onClick={() => this.props.deleteParameterValue(idx)}>
                                    <DeleteIcon />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <Box mt={4}>
                          <Button variant="contained" color="secondary" size="small" onClick={this.props.addParameterValue}>
                            <AddIcon />&nbsp;&nbsp;Add Parameter Value
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Box mt={8} display={(this.props.dataFeed.dataFeed === 's3upload') ? 'block' : 'none'}>
                  <Typography variant="h4" gutterBottom>
                    Amazon S3 File Upload Options
                  </Typography>

                  <Box mt={8}>
                    <FormControl fullWidth variant="outlined">
                      <MedTextField
                        name="S3UploadBucket"
                        error={this.props.errors.invalidBucketName}
                        onChange={(event) => this.props.handleDataFeedOptions(event)}
                        value={this.props.dataFeed.dataFeedConfig.S3UploadBucket}
                        label="S3 Bucket"
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><b>S3://</b></InputAdornment>,
                        }}
                      />
                    </FormControl>
                  </Box>
                  
                  <Box mt={8}>
                    <Paper variant="outlined">
                      <ExpansionPanel>
                        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>Plugin Requirements</Typography>
                        </ExpansionPanelSummary>
                        <ExpansionPanelDetails>
                          <p>
                            This plugin requires an AWS access key ID and secret access key pair to authenticate to the provided bucket. Create an AWS credentials file in the style of the <code>~/.aws/credentials</code> example provided <Link href="https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html" target="_blank">here</Link> and run the following command to create a secret in your Kubernetes cluster namespace as the contents of this file:
                          </p>
                          <p>
                            <code>
                              kubectl create secret generic aws -n {this.props.agentNamespace || 'unknown_namespace'} --from-file=/path/to/aws/credentials
                            </code>
                          </p>
                        </ExpansionPanelDetails>
                      </ExpansionPanel>
                    </Paper>
                  </Box>
                  
                </Box>

                <Box mt={8} display={(this.props.dataFeed.dataFeed === 'custom') ? 'block' : 'none'}>
                  <Box>
                    <Typography variant="h4" gutterBottom>
                      Custom Container/Plugin Configuration
                    </Typography>

                    <p>Some documentation for developing your own custom container/plugin can be found on the <Link href="/developers" target="_blank">developers page</Link>.
                    </p>
                  </Box>

                  <Box mt={4}>
                    <MedTextField
                      name="image"
                      error={this.props.errors.image}
                      value={this.props.dataFeed.dataFeedConfig.image}
                      onChange={(event) => this.props.handleDataFeedOptions(event)}
                      label="Docker Image"
                      placeholder="amazon/aws-cli"
                      InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Docker image URL (Dockerhub example: 'amazon/aws-cli')" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                    />
                  </Box>
                  <Box mt={4}>
                    <MedTextField
                      name="tag"
                      error={this.props.errors.tag}
                      value={this.props.dataFeed.dataFeedConfig.tag}
                      onChange={(event) => this.props.handleDataFeedOptions(event)}
                      label="Docker Image Tag"
                      placeholder="latest"
                      InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Image tag/version (e.g. 'latest', '5.0.0')" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                    />
                  </Box>
                  <Box mt={4}>
                    <MedTextField
                      name="shell"
                      error={this.props.errors.shell}
                      value={this.props.dataFeed.dataFeedConfig.shell}
                      onChange={(event) => this.props.handleDataFeedOptions(event)}
                      label="Shell Path"
                      placeholder="/bin/bash"
                      InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Custom container commands will be prefaced with this shell path, i.e. <shell path> -c '<command>' '<args>'" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                    />
                  </Box>
                  <Box mt={4}>
                    <WideTextField
                      name="command"
                      multiline
                      rowsMax="4"
                      value={this.props.dataFeed.dataFeedConfig.command}
                      onChange={(event) => this.props.handleDataFeedOptions(event)}
                      label="Command (optional)"
                      InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Optional command to override container default, in Docker this field name is 'entrypoint'." placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                    />
                  </Box>

                  <Box mt={4}>
                    <WideTextField
                      name="args"
                      multiline
                      rowsMax="4"
                      value={this.props.dataFeed.dataFeedConfig.args}
                      onChange={(event) => this.props.handleDataFeedOptions(event)}
                      label="Args (optional)"
                      InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Optional command to override container default, in Docker this field name is 'cmd'." placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                    />
                  </Box>

                  <Button variant="contained" color="secondary" mt={4} size="small" onClick={() => { this.props.addSecret('volume'); }}>
                    <HardDriveIcon />&nbsp;
                    Attach Secret Disk/Volume to Container
                  </Button>&nbsp;<Button variant="contained" color="secondary" mt={4} size="small" onClick={() => { this.props.addSecret('env'); }}>
                    <CodeIcon />&nbsp;
                    Attach Environment Variable to Container
                  </Button>

                  <Box mt={8}>
                    {namespaceTip}
                    <Table size="small" style={{ width: 'auto' }}>
                      <TableBody>
                        {this.props.dataFeed.feedSecrets.map((secret:CustomSecret, idx:number) => {
                          if (secret.secretType === 'volume') {
                            return (
                              <TableRow key={idx}>
                                <TableCell style={{ paddingLeft: 0 }}>
                                  <HardDriveIcon />
                                </TableCell>
                                <TableCell>
                                  <FormControl fullWidth>
                                    <TextField
                                      name="secretName"
                                      value={secret.secretName}
                                      label="Secret Name"
                                      variant="outlined"
                                      margin="dense"
                                      onChange={(event) => this.props.handleCustomSecret(event, idx)}
                                      InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Kubernetes secret name as it appears in 'kubectl get secrets'" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                                    />
                                  </FormControl>
                                </TableCell>
                                <TableCell>
                                  <FormControl fullWidth>
                                    <TextField
                                      name="secretKey"
                                      value={secret.secretKey}
                                      label="Secret Key"
                                      variant="outlined"
                                      margin="dense"
                                      onChange={(event) => this.props.handleCustomSecret(event, idx)}
                                      InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Kubernetes secret key contained within this secret" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                                    />
                                  </FormControl>
                                </TableCell>
                                <TableCell>
                                  <FormControl fullWidth>
                                    <TextField
                                      name="secretPath"
                                      value={secret.secretPath}
                                      label="Secret Container Path"
                                      variant="outlined"
                                      margin="dense"
                                      onChange={(event) => this.props.handleCustomSecret(event, idx)}
                                      InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Path to mount this secret within your container" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                                    />
                                  </FormControl>
                                </TableCell>
                                <TableCell>
                                  <Button variant="contained" size="small" color="secondary" onClick={() => this.props.handleDeleteSecret(idx)}>
                                    <DeleteIcon />&nbsp;&nbsp;Delete
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          }
                          if (secret.secretType === 'env') {
                            return (
                              <TableRow>
                                <TableCell style={{ paddingLeft: 0 }}>
                                  <CodeIcon />
                                </TableCell>
                                <TableCell>
                                  <FormControl fullWidth>
                                    <TextField
                                      name="secretName"
                                      value={secret.secretName}
                                      label="Secret Name"
                                      variant="outlined"
                                      margin="dense"
                                      onChange={(event) => this.props.handleCustomSecret(event, idx)}
                                      InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Kubernetes secret name as it appears in 'kubectl get secrets'" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                                    />
                                  </FormControl>
                                </TableCell>
                                <TableCell>
                                  <FormControl fullWidth>
                                    <TextField
                                      name="secretKey"
                                      value={secret.secretKey}
                                      label="Secret Key"
                                      variant="outlined"
                                      margin="dense"
                                      onChange={(event) => this.props.handleCustomSecret(event, idx)}
                                      InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Kubernetes secret key contained within this secret" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                                    />
                                  </FormControl>
                                </TableCell>
                                <TableCell>
                                  <FormControl fullWidth>
                                    <TextField
                                      name="envName"
                                      value={secret.envName}
                                      label="Variable Name"
                                      variant="outlined"
                                      margin="dense"
                                      onChange={(event) => this.props.handleCustomSecret(event, idx)}
                                      InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Environment variable name to be presented to this container, often in all caps" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
                                    />
                                  </FormControl>
                                </TableCell>
                                <TableCell>
                                  <Button variant="contained" size="small" color="secondary" onClick={() => this.props.handleDeleteSecret(idx)}>
                                    <DeleteIcon />&nbsp;&nbsp;Delete
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          }

                          return null;
                        })}
                      </TableBody>
                    </Table>
                  </Box>
              </Box>
              </DialogContentText>

              <DialogActions>
                <Box display={(this.props.dataFeed.dataFeed !== '') ? 'block' : 'none'}>
                  <Button
                    color="default"
                    variant="contained"
                    onClick={this.props.handleDataFeedBack}
                  >
                    Back
                  </Button>&nbsp;
                  <Button
                    color="secondary"
                    variant="contained"
                    onClick={this.props.saveDataFeedChanges}
                  >
                    Update
                  </Button>
                </Box>
                <Box display={(this.props.dataFeed.dataFeed === '') ? 'block' : 'none'}>
                  <Button color="secondary" onClick={this.props.handleDataFeedCancel}>
                    Cancel
                  </Button>
                </Box>
              </DialogActions>
            </DialogContent>
          </Dialog>

          <Grid container>
            <Grid item xs={8}>
              <Typography variant="body1" gutterBottom>
                Data feeds provide several options for populating and/or syncing data with your No PII Zone on a recurring basis and sharing data with your internal and external stakeholders. With or without a data feed you can retrieve output files via the <code>Download Export</code> command provided by the <Link href="/developers" target="_blank">Redactics Agent CLI</Link>.
              </Typography>
            </Grid>
          </Grid>

          <Box mt={8}>
            {this.outputTable()}
          </Box>
        </Box>
      </React.Fragment>
    );
  }
}

export default WorkflowPostExport;

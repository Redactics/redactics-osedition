import React from 'react';
import styled from 'styled-components';
import { withStyles } from '@material-ui/core/styles';

import { spacing } from '@material-ui/system';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import {
  TextField as MuiTextField,
  FormControl as MuiFormControl,
  Button,
  Box,
  Select,
  MenuItem,
  Tooltip,
  InputAdornment,
  InputLabel,
  Paper,
  ExpansionPanel,
  ExpansionPanelDetails as MuiExpansionPanelDetails,
  ExpansionPanelSummary,
  Typography,
} from '@material-ui/core';

import {
  HelpOutline as HelpIcon,
  ExpandMore as ExpandMoreIcon,
} from '@material-ui/icons';

import {
  Clipboard as ClipboardIcon,
} from 'react-feather';

import { WorkflowRecord } from '../../types/redactics';

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

const styles = {
  selectAdornment: {
    marginRight: '-30px',
  },
};

/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable no-useless-escape */

interface IProps {
  workflow: WorkflowRecord;
  handleWFChanges: any;
  classes: any;
  inputs: any;
  agentNamespace: string;
  clipboardCopy: any;
}

interface IState {

}

class DatabaseMigrationSetup extends React.Component<IProps, IState> {
  render() {
    const helmHook = `
apiVersion: batch/v1
kind: Job
metadata:
  name: trigger-db-migration-mock-{{ .Release.Revision }}
  namespace: ${this.props.workflow.migrationNamespace || "default"}
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "${this.props.workflow.migrationHelmHookWeight || "0"}"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: trigger-db-migration-mock
          image: redactics/airflow-dagrun-poller:1.1.0
          imagePullPolicy: Always
          args:
          - bash
          - -c
          - |
              DAG_RUN_ID=$(curl -s -X POST -d "{\\"workflowType\\": \\"mockDatabaseMigration\\", \\"workflowId\\": \\"\${WORKFLOW_ID}\\"}" -H "Content-Type: application/json" -H "Accept: application/json" \${REDACTICS_API_URL}/workflow/jobs | jq -r '.uuid')
              curl -s -X POST -H "Authorization: Basic \${BASIC_AUTH}" -H "Content-Type: application/json" -H "Accept: application/json" -d "{\\"dag_run_id\\": \\"\${DAG_RUN_ID}\\", \\"conf\\": {\\"workflowJobId\\": \\"\${DAG_RUN_ID}\\"}}" \${API_URL}/api/v1/dags/\${DAG_ID}/dagRuns
              TAIL_TASK_ID=clone-db DAG_RUN_ID=\${DAG_RUN_ID} /poller.sh
              if [ $? -ne 0 ]; then
                exit 1
              fi
          env:
          - name: REDACTICS_API_URL
            value: http://agent-api.svc.cluster.local
          - name: API_URL
            value: http://agent-webserver.${this.props.agentNamespace}.svc.cluster.local:8080
          - name: DAG_ID
            value: ${this.props.workflow.uuid}-migrationmocking
          - name: WORKFLOW_ID
            value: ${this.props.workflow.uuid}
          - name: BASIC_AUTH
            valueFrom:
              secretKeyRef:
                name: agent
                key: basic-auth
    `
    const script = `
#!/bin/bash

# change values as necessary, this script will work when running inside a Kubernetes container, and when the
# BASIC_AUTH variable is set outside of this script from values stored as Kubernetes secrets.
# The open source libraries "curl" and "jq" must be available within this environment, in addition to the poller.sh script.

export REDACTICS_API_URL=http://agent-api.svc.cluster.local
export API_URL=http://agent-webserver.${this.props.agentNamespace}.svc.cluster.local:8080
export DAG_ID=${this.props.workflow.uuid}-migrationmocking
export WORKFLOW_ID=${this.props.workflow.uuid}
export POLLER_PATH=/poller.sh

DAG_RUN_ID=$(curl -s -X POST -d "{\\"workflowType\\": \\"mockDatabaseMigration\\", \\"workflowId\\": \\"\${WORKFLOW_ID}\\"}" -H "Content-Type: application/json" -H "Accept: application/json" \${REDACTICS_API_URL}/workflow/jobs | jq -r '.uuid')
curl -s -X POST -H "Authorization: Basic \${BASIC_AUTH}" -H "Content-Type: application/json" -H "Accept: application/json" -d "{\\"dag_run_id\\": \\"\${DAG_RUN_ID}\\", \\"conf\\": { \\"workflowJobId\\": \\"\${DAG_RUN_ID}\\"}}" \${API_URL}/api/v1/dags/\${DAG_ID}/dagRuns
TAIL_TASK_ID=clone-db DAG_RUN_ID=\${DAG_RUN_ID} \${POLLER_PATH}
    `
    
    return (
      <React.Fragment>
        <Box>
          Performing a dry run of your migrations requires your adding a step to your CI/CD pipeline (or manual deployment process) to trigger a workflow included in the Redactics Agent. This workflow clones your database to prepare for your database migration dry-run against this clone. Once this step is complete you can then run your migration using an environment variable to override your database that would normally be used with your cloned database.
        </Box>

        <Box mt={4}>
          One way to put together a complete working flow is to add some sort of flag in your CI/CD workflow that triggers this alteration to your normal workflow when this database migration dry-run option is selected, followed by the database migration against the clone. This can be done by triggering a script that runs on your server hosting your app, or if your database migration is triggered via a Kubernetes Helmchart hook, adding an additional hook that runs before your normal migration hook.
        </Box>

        <Box mt={4}>
          Using the values you provide here, we will generate the code needed to perform this additional step (prior to your normal database migration) which you can customize as needed. We will also generate an authentication token for the REST API embedded into the Redactics Agent. This secret will be installed into your Kubernetes namespace (as you've provided below) the next time you upgrade your Redactics Agent software.
        </Box>

        <Box mt={8}>
          <FormControl fullWidth>
            <TextField
              //error={this.props.errors.migrationNamespace}
              name="migrationNamespace"
              label="Kubernetes Namespace"
              value={this.props.workflow.migrationNamespace}
              onChange={(event) => this.props.handleWFChanges(event, this.props.workflow.uuid)}
              InputProps={{ endAdornment: <InputAdornment className={this.props.classes.selectAdornment} position="end"><Tooltip title="Kubernetes namespace where your database migrations run" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
            />
          </FormControl>
        </Box>

        <Box mt={4}>
          <FormControl fullWidth>
            <TextField
              //error={this.props.errors.migrationDatabase}
              name="migrationDatabase"
              label="Database Name"
              value={this.props.workflow.migrationDatabase}
              onChange={(event) => this.props.handleWFChanges(event, this.props.workflow.uuid)}
              InputProps={{ endAdornment: <InputAdornment className={this.props.classes.selectAdornment} position="end"><Tooltip title="Database name of database that should be cloned" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
            />
          </FormControl>
        </Box>

        <Box mt={4}>
          <FormControl fullWidth>
            <TextField
              //error={this.props.errors.migrationDatabaseClone}
              name="migrationDatabaseClone"
              label="Cloned Database Name"
              value={this.props.workflow.migrationDatabaseClone}
              onChange={(event) => this.props.handleWFChanges(event, this.props.workflow.uuid)}
              InputProps={{ endAdornment: <InputAdornment className={this.props.classes.selectAdornment} position="end"><Tooltip title="Database name for your clone" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
            />
          </FormControl>
        </Box>

        <Box mt={4}>
          <FormControl fullWidth>
            <InputLabel htmlFor="agent">Generate Configuration For</InputLabel>
            <Select
              //error={this.props.errors.migrationConfiguration}
              name="migrationConfiguration"
              value={this.props.workflow.migrationConfiguration}
              onChange={(event) => this.props.handleWFChanges(event, this.props.workflow.uuid)}
            >
              <MenuItem key="helmhook" value="helmhook">Sample Helmchart Hook</MenuItem>
              <MenuItem key="script" value="script">Sample Script</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box mt={4} display={(this.props.workflow.migrationConfiguration === "helmhook") ? "block" : "none"}>
          <FormControl fullWidth>
            <TextField
              //error={this.props.errors.migrationDatabaseClone}
              name="migrationHelmHookWeight"
              type="number"
              label="Helmchart Hook Weight"
              value={this.props.workflow.migrationHelmHookWeight || "0"}
              onChange={(event) => this.props.handleWFChanges(event, this.props.workflow.uuid)}
              InputProps={{ endAdornment: <InputAdornment className={this.props.classes.selectAdornment} position="end"><Tooltip title="Helmchart hook weight (hooks are executed in ascending order)" placement="right-start"><HelpIcon /></Tooltip></InputAdornment> }}
            />
          </FormControl>
        </Box>

        <Box mt={8} display={(this.props.workflow.migrationConfiguration === "helmhook") ? "block" : "none"}>
          <Paper variant="outlined">
            <ExpansionPanel>
              <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Sample Helmchart Hook</Typography>
              </ExpansionPanelSummary>
              <ExpansionPanelDetails>
                <Box>
                  <CopyToClipboard text={helmHook} onCopy={() => this.props.clipboardCopy("sampleMigrationHook")}>
                    <Button variant="outlined" size="small" color="secondary"><ClipboardIcon /></Button>
                  </CopyToClipboard>
                </Box>
                <Box mt={2}>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {helmHook}
                  </pre>
                </Box>
              </ExpansionPanelDetails>
            </ExpansionPanel>
          </Paper>
        </Box>

        <Box mt={8} display={(this.props.workflow.migrationConfiguration === "script") ? "block" : "none"}>
          <Paper variant="outlined">
            <ExpansionPanel>
              <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Sample Script</Typography>
              </ExpansionPanelSummary>
              <ExpansionPanelDetails>
                <Box>
                  <CopyToClipboard text={script} onCopy={() => this.props.clipboardCopy("sampleMigrationScript")}>
                    <Button variant="outlined" size="small" color="secondary"><ClipboardIcon /></Button>
                  </CopyToClipboard>
                </Box>
                <Box mt={2}>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {script}
                  </pre>
                </Box>
              </ExpansionPanelDetails>
            </ExpansionPanel>
          </Paper>
        </Box>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(DatabaseMigrationSetup);

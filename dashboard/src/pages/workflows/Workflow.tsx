import React from 'react';
import styled from 'styled-components';
import { withStyles } from '@material-ui/core/styles';

// import { red, green, blue } from "@material-ui/core/colors";
import { CopyToClipboard } from 'react-copy-to-clipboard';

import {
  Card as MuiCard,
  CardContent,
  Grid as MuiGrid,
  Typography,
  Button as MuiButton,
  Box,
  Snackbar,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  ExpansionPanel,
  ExpansionPanelDetails as MuiExpansionPanelDetails,
  ExpansionPanelSummary,
  FormControl as MuiFormControl,
  InputLabel,
  Select as MuiSelect,
  MenuItem,
} from '@material-ui/core';

import { Alert as MuiAlert } from '@material-ui/lab';

import {
  ExpandMore as ExpandMoreIcon,
  DeleteOutline as DeleteIcon,
  Close as CloseIcon,
} from '@material-ui/icons';

import {
  Save as SaveIcon,
  Clipboard as ClipboardIcon,
} from 'react-feather';

import { spacing } from '@material-ui/system';
import RedacticsContext from '../../contexts/RedacticsContext';

import WorkflowRedactionRules from './WorkflowRedactionRules';
import WorkflowInputs from './WorkflowInputs';
import WorkflowSchedule from './WorkflowSchedule';
import WorkflowExport from './WorkflowExport';
import WorkflowPostExport from './WorkflowPostExport';
import DatabaseMigrationSetup from './DatabaseMigrationSetup';

import {
  RedactRule, CustomSecret, WorkflowRecord, WorkflowUpdate, PostUpdateParam,
  AgentRecord, RedactRulePreset, RedactRuleSet, DataFeed, AgentInputRecord, 
  WorkflowInputRecord,
} from '../../types/redactics';

const Card = styled(MuiCard)(spacing);

const Grid = styled(MuiGrid)(spacing);

const Button = styled(MuiButton)(spacing);

const Alert = styled(MuiAlert)(spacing);

const styles = {
  selectAdornment: {
    marginRight: '-30px',
  },
};

const FormControlSpacing = styled(MuiFormControl)(spacing);

const FormControl = styled(FormControlSpacing)`
  min-width: 200px;
  max-width: 200px;
`;

const Select = styled(MuiSelect)(spacing);

const ExpansionPanelDetails = withStyles({
  root: {
    display: 'block',
  },
})(MuiExpansionPanelDetails);

interface IProps {
  deleteWorkflow: any;
  handleWFChanges: any;
  workflow: WorkflowRecord;
  agentInputs: AgentInputRecord[];
  agents: AgentRecord[];
  presets?: RedactRulePreset[];
  redactrulesets: RedactRuleSet[];
  redactrules?: RedactRule[];
  classes: any;
}

interface IState {
  errors: any;
  agentId: string;
  saveButtonDisabled: boolean;
  agentNamespace?: string;
  addAllS3Uploads: boolean;
  S3UploadBucket: string;
  tableOutputOptions: any;
  constraintSchema: string;
  constraintTable: string;
  exportTableSchemaAll: boolean;
  exportTableDataAll: boolean;
  S3UploadFileChecked: string[];
  exportTableDataConfig: any;
  displayExportTableData: string;
  displayExportTableSchema: string;
  customSchedule: boolean;
  scheduleSelection: string;
  schedule: string;
  exportSchedule: boolean;
  maskingRuleValues: RedactRule[];
  maskingRules: RedactRule[];
  numMaskingRules: number;
  newRuleKey: number;
  input: WorkflowInputRecord;
  inputs: WorkflowInputRecord[];
  dataFeed: DataFeed;
  dataFeeds: DataFeed[];
  newInputKey: number;
  newDataFeedKey: number;
  addTable: string;
  transformExpanded: boolean;
  outputExpanded: boolean;
  allDatabaseTables: string[];
  currentDatabaseTable: string;
  numInputs: number;
  workflowType: string;
  deltaUpdateField: string;
  snackbarText: string;
  // dialog toggles
  showDialog: boolean;
  showSnackbar: boolean;
  helmReminderCheckbox: boolean;
  showHelmReminder: boolean;
  validDiskSize: boolean;
  validName: boolean;
  validSchedule: boolean;
  missingSecretField: boolean;
  invalidOutputSettingField: boolean;
  missingPostExportHookField: boolean;
  missingSchemaSelection: boolean;
  dupeTableExportFound: boolean;
  dupeRedactRuleFound: boolean;
  completeRedactRules: boolean;
  deleteWorkflowConfirmation: boolean;
  showLastReportedError: boolean;
  ackHelmReminder: boolean;
  orphanedWorkflow: boolean;
  editInputDialog: boolean;
  showSnackbarEdit: boolean;
  showOutputOptions: boolean;
  editDataFeed: boolean;
  invalidDeltaUpdate: boolean;
  invalidPreparedStatement: boolean;
  mockMigrationDatabase: boolean;
  invalidDigitalTwinOutput: boolean;
  invalidForgetUserFields: boolean;
  invalidMigrationFields: boolean;
  digitalTwinAdded: boolean;
  // snackbar toggles
  showClipboardSnackbar: boolean;
}

class Workflow extends React.Component<IProps, IState> {
  static contextType = RedacticsContext;

  constructor(props:IProps) {
    super(props);

    this.saveChanges = this.saveChanges.bind(this);
    this.hideHelmReminder = this.hideHelmReminder.bind(this);
    this.toggleHelmReminder = this.toggleHelmReminder.bind(this);
    this.addMaskingRule = this.addMaskingRule.bind(this);
    this.deleteMaskingRule = this.deleteMaskingRule.bind(this);
    this.handleRuleChange = this.handleRuleChange.bind(this);
    this.showLastReportedError = this.showLastReportedError.bind(this);
    this.hideLastReportedError = this.hideLastReportedError.bind(this);
    this.addSecret = this.addSecret.bind(this);
    this.handleDeleteSecret = this.handleDeleteSecret.bind(this);
    this.hideErrorDialog = this.hideErrorDialog.bind(this);
    this.handleExportSchedule = this.handleExportSchedule.bind(this);
    this.handleSchedule = this.handleSchedule.bind(this);
    this.handleDeltaUpdate = this.handleDeltaUpdate.bind(this);
    this.handleCustomSecret = this.handleCustomSecret.bind(this);
    this.validateRedactionRules = this.validateRedactionRules.bind(this);
    this.handleTableOutputChanges = this.handleTableOutputChanges.bind(this);
    this.deleteWorkflowConfirmation = this.deleteWorkflowConfirmation.bind(this);
    this.cancelWorkflowConfirmation = this.cancelWorkflowConfirmation.bind(this);
    this.clipboardCopy = this.clipboardCopy.bind(this);
    this.handleSnackbarClose = this.handleSnackbarClose.bind(this);
    this.getExportFileNames = this.getExportFileNames.bind(this);
    this.saveInputChanges = this.saveInputChanges.bind(this);
    this.triggerEditInputDialog = this.triggerEditInputDialog.bind(this);
    this.handleInputChanges = this.handleInputChanges.bind(this);
    this.selectInputSource = this.selectInputSource.bind(this);
    this.handleAddTable = this.handleAddTable.bind(this);
    this.triggerAddTable = this.triggerAddTable.bind(this);
    this.hideInputDialog = this.hideInputDialog.bind(this);
    this.deleteDatabaseTable = this.deleteDatabaseTable.bind(this);
    this.deleteWorkflow = this.deleteWorkflow.bind(this);
    this.transformExpansion = this.transformExpansion.bind(this);
    this.triggerOutputOptions = this.triggerOutputOptions.bind(this);
    this.deleteConstraint = this.deleteConstraint.bind(this);
    this.hideOutputOptions = this.hideOutputOptions.bind(this);
    this.genConstraintSummary = this.genConstraintSummary.bind(this);
    this.addDataFeed = this.addDataFeed.bind(this);
    this.hideDataFeed = this.hideDataFeed.bind(this);
    this.handleDataFeed = this.handleDataFeed.bind(this);
    this.addParameterValue = this.addParameterValue.bind(this);
    this.updateParameterValue = this.updateParameterValue.bind(this);
    this.deleteParameterValue = this.deleteParameterValue.bind(this);
    this.handleDataFeedBack = this.handleDataFeedBack.bind(this);
    this.handleDataFeedCancel = this.handleDataFeedCancel.bind(this);
    this.handleDataFeedOptions = this.handleDataFeedOptions.bind(this);
    this.saveDataFeedChanges = this.saveDataFeedChanges.bind(this);
    this.triggerEditDataFeed = this.triggerEditDataFeed.bind(this);
    this.deleteDataFeed = this.deleteDataFeed.bind(this);
    this.resetDataFeedErrors = this.resetDataFeedErrors.bind(this);
    this.addTableSelection = this.addTableSelection.bind(this);
    this.deleteTableSelection = this.deleteTableSelection.bind(this);
    //this.saveFeedback = this.saveFeedback.bind(this);

    const maskingRuleValues:RedactRule[] = [];
    if (this.props.workflow.redactrules && this.props.workflow.redactrules.length) {
      this.props.workflow.redactrules.forEach((rule:RedactRule) => {
        let t = rule.table.split('.');
        let schema = t.length ? t[0] : 'public';
        let table = t.length ? t[1] : '';
        maskingRuleValues.push({
          key: rule.uuid,
          schema,
          table,
          databaseTable: rule.databaseTable,
          column: rule.column,
          rule: rule.rule,
          presetUuid: rule.presetUuid,
        });
      });
    }

    const thisAgentSearch = this.props.agents.find(
      (a:AgentRecord) => ((a.uuid === this.props.workflow.agentId)),
    );
    const agentNamespace = (thisAgentSearch) ? thisAgentSearch.namespace : '';

    const state:IState = {
      agentId: this.props.workflow.agentId,
      newRuleKey: 0,
      transformExpanded: (this.props.workflow.allDatabaseTables && this.props.workflow.allDatabaseTables.length) ? true : false,
      outputExpanded: false,
      allDatabaseTables: this.props.workflow.allDatabaseTables,
      saveButtonDisabled: false,
      showHelmReminder: false,
      helmReminderCheckbox: false,
      showLastReportedError: false,
      maskingRules: [],
      maskingRuleValues,
      completeRedactRules: true,
      dupeRedactRuleFound: false,
      dupeTableExportFound: false,
      missingSchemaSelection: false,
      missingSecretField: false,
      invalidOutputSettingField: false,
      missingPostExportHookField: false,
      validSchedule: true,
      validName: true,
      validDiskSize: true,
      numMaskingRules: maskingRuleValues.length,
      exportSchedule: !!((this.props.workflow.schedule && this.props.workflow.schedule !== 'None')),
      scheduleSelection: (this.props.workflow.schedule && !this.props.workflow.schedule.match(/^@/) && this.props.workflow.schedule !== 'None') ? 'custom' : this.props.workflow.schedule || '',
      customSchedule: !!((this.props.workflow.schedule && !this.props.workflow.schedule.match(/^@/) && this.props.workflow.schedule !== 'None')),
      schedule: this.props.workflow.schedule || 'None',
      tableOutputOptions: {
        errors: {},
        numDays: 30,
        sampleFields: "createdAndUpdated",
        createdAtField: "created_at",
        updatedAtField: "updated_at",
        disableDeltaUpdates: false,
      },
      constraintSchema: "public",
      constraintTable: "",
      exportTableDataConfig: [],
      addTable: '',
      displayExportTableSchema: 'none',
      displayExportTableData: 'none',
      showClipboardSnackbar: false,
      agentNamespace,
      S3UploadFileChecked: [],
      S3UploadBucket: '',
      errors: {
        schedule: false,
        name: false,
        diskSize: false,
        duplicateDataFeed: false,
      },
      input: {
        uuid: "",
        enabled: true,
        tables: [],
        tableSelection: ""
      },
      inputs: this.props.workflow.inputs,
      numInputs: this.props.workflow.inputs.length,
      dataFeed: {
        uuid: "",
        dataFeed: "",
        dataFeedConfig: {
          postUpdateKeyValues: []
        },
        feedSecrets: [],
      },
      dataFeeds: this.props.workflow.datafeeds,
      editInputDialog: false,
      showDialog: false,
      showSnackbarEdit: false,
      newInputKey: 0,
      newDataFeedKey: 0,
      addAllS3Uploads: false,
      exportTableSchemaAll: false,
      exportTableDataAll: false,
      showSnackbar: false,
      deleteWorkflowConfirmation: false,
      ackHelmReminder: false,
      orphanedWorkflow: false,
      currentDatabaseTable: "",
      showOutputOptions: false,
      editDataFeed: false,
      invalidDeltaUpdate: false,
      invalidPreparedStatement: false,
      mockMigrationDatabase: false,
      invalidDigitalTwinOutput: false,
      invalidForgetUserFields: false,
      invalidMigrationFields: false,
      digitalTwinAdded: false,
      workflowType: '',
      deltaUpdateField: this.props.workflow.deltaUpdateField || "",
      snackbarText: ""
    };

    if (this.props.workflow.exportTableDataConfig && Object.keys(this.props.workflow.exportTableDataConfig).length) {
      Object.keys(this.props.workflow.exportTableDataConfig).forEach((idx:any) => {
        const table:string = Object.keys(this.props.workflow.exportTableDataConfig[idx])[0];
        const config:any = this.props.workflow.exportTableDataConfig[idx][table];
        state.exportTableDataConfig.push({
          table,
          numDays: config.numDays,
          sampleFields: config.sampleFields,
          createdAtField: config.createdAtField,
          updatedAtField: config.updatedAtField,
          disableDeltaUpdates: config.disableDeltaUpdates,
        });
      });
    }

    this.props.redactrulesets.forEach((rule:RedactRuleSet) => {
      state.maskingRules.push({
        schema: '',
        table: '',
        databaseTable: '',
        column: '',
        rule: '',
        key: rule.redactKey,
        val: rule.redactName,
      });
    });

    if (this.props.presets && this.props.presets.length) {
      this.props.presets.forEach((preset:RedactRulePreset) => {
        if (!preset.isDefault) {
          state.maskingRules.push({
            schema: '',
            table: '',
            databaseTable: '',
            column: '',
            rule: '',
            key: `preset-${preset.uuid}`,
            val: `Preset: ${preset.presetName}`,
            presetUuid: preset.uuid,
          });
        }
      });
    }

    // look for orphaned workflows
    if (this.props.workflow.workflowType === "ERL" && !this.props.workflow.agentId) {
      state.orphanedWorkflow = true;
    }

    // init state
    this.state = state;
  }

  componentDidMount() {
    // copy context data into component state
    this.setState({
      ackHelmReminder: this.context.ackHelmReminder,
    });
  }

  clipboardCopy(copied:string) {
    let copiedText:string = "";
    switch (copied) {
      case 'dbuuid':
      copiedText = "This workflow UUID has been copied to your clipboard";
      break;

      case 'sampleMigrationHook':
      copiedText = "This sample Helmchart hook has been copied to your clipboard";
      break;

      case 'sampleMigrationScript':
      copiedText = "This sample script has been copied to your clipboard";
      break;
    }
    this.setState({
      showClipboardSnackbar: true,
      snackbarText: copiedText,
    });
  }

  handleRuleChange(key:string, event:any) {
    const { maskingRuleValues } = this.state;
    const values = this.state.maskingRuleValues.filter((value:RedactRule) => value.key === key);

    maskingRuleValues.map((row:RedactRule) => {
      if (row.key === key && event.target.name === 'databaseTable') {
        values[0].databaseTable = event.target.value;
      } else if (row.key === key && event.target.name === 'schema') {
        values[0].schema = event.target.value;
      } else if (row.key === key && event.target.name === 'table') {
        values[0].table = event.target.value;
      } else if (row.key === key && event.target.name === 'column') {
        values[0].column = event.target.value;
      } else if (row.key === key && event.target.name === 'rule') {
        values[0].rule = event.target.value;
        if (event.target.value.match(/^preset-/)) {
          const preset = this.state.maskingRules.filter((mr:RedactRule) => {
            if (mr.key === event.target.value) {
              return mr;
            }

            return false;
          });
          values[0].presetUuid = preset[0].presetUuid;
        } else {
          values[0].presetUuid = '';
        }
      }

      return values;
    });

    this.setState({
      maskingRuleValues,
    });

    // console.log(maskingRuleValues)
  }

  async saveChanges(workflowId:string) {
    // console.log(this.state);

    this.setState({
      saveButtonDisabled: true,
      errors: {},
    });

    // prep exportTableDataConfig
    let exportTableDataConfig:any = [];
    this.state.exportTableDataConfig.forEach((c:any) => {
      const config = c;
      delete config.errors;
      let exportTableDataConfigObj:any = {};
      exportTableDataConfigObj[config.table] = config;
      exportTableDataConfig.push(exportTableDataConfigObj)
    });

    const payload:WorkflowUpdate = {
      name: this.props.workflow.name,
      agentId: this.props.workflow.agentId,
      workflowType: this.props.workflow.workflowType,
      inputs: this.state.inputs,
      dataFeeds: this.state.dataFeeds,
      redactRules: this.state.maskingRuleValues,
      schedule: this.state.schedule,
      exportTableDataConfig,
      deltaUpdateField: this.state.deltaUpdateField,
      migrationNamespace: this.props.workflow.migrationNamespace,
      migrationDatabase: this.props.workflow.migrationDatabase,
      migrationDatabaseClone: this.props.workflow.migrationDatabaseClone,
      migrationConfiguration: this.props.workflow.migrationConfiguration,
      migrationHelmHookWeight: this.props.workflow.migrationHelmHookWeight,
    };

    //console.log('PAYLOAD', payload);
    //console.log(this.state);

    if (this.validateRedactionRules() && this.validateMigrationMockFields()) {
      try {
        const response = await fetch(`${this.context.apiUrl}/workflow/${workflowId}`, {
          method: 'put',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        this.setState({
          saveButtonDisabled: false,
        });

        const data = await response.json();

        if (data.errors) {
          let invalidSchedule:boolean = false;
          let orphanedWorkflow:boolean = false;
          let invalidDeltaUpdate:boolean = false;
          let invalidPreparedStatement:boolean = false;
          let mockMigrationDatabase:boolean = false;
          let invalidDigitalTwinOutput:boolean = false;
          const invalidScheduleError = "Invalid schedule";
          const orphanedWorkflowError = "Invalid agent ID";
          const invalidDeltaUpdateError = "You must provide your delta update field to enable delta updates";
          const invalidPreparedStatementError = "You must provide some key/value pairs for your prepared statements";
          const mockMigrationDatabaseError = "Your input and target database cannot be identical";
          const invalidDigitalTwinOutputError = "Your digital twin output cannot be the same as your input";
          
          if (Array.isArray(data.errors)) {
            // multiple errors found
            invalidSchedule = data.errors.find((e:any) => ((e.msg === invalidScheduleError)));
            orphanedWorkflow = data.errors.find((e:any) => ((e.msg === orphanedWorkflowError) && e.param === 'agentId'));
            invalidDeltaUpdate = data.errors.find((e:any) => ((e.msg === invalidDeltaUpdateError)));
            invalidPreparedStatement = data.errors.find((e:any) => ((e.msg === invalidPreparedStatementError)));
            mockMigrationDatabase = data.errors.find((e:any) => ((e.msg === mockMigrationDatabaseError)));
            invalidDigitalTwinOutput = data.errors.find((e:any) => ((e.msg === invalidDigitalTwinOutputError)));
          }
          else {
            // single error returned as string
            invalidSchedule = (data.errors === invalidScheduleError) ? true : false;
            orphanedWorkflow = (data.errors === orphanedWorkflowError) ? true : false;
            invalidPreparedStatement = (data.errors === invalidPreparedStatementError) ? true : false;
            mockMigrationDatabase = (data.errors === mockMigrationDatabaseError) ? true : false;
            invalidDigitalTwinOutput = (data.errors === invalidDigitalTwinOutputError) ? true : false;
          }
          if (invalidSchedule) {
            this.setState({
              validSchedule: false,
              errors: {
                schedule: true,
              },
            });
          } else if (orphanedWorkflow) {
            this.setState({
              orphanedWorkflow: true,
              errors: {
                agentId: true,
              },
            });
          } else if (invalidDeltaUpdate) {
            this.setState({
              invalidDeltaUpdate: true,
            });
          } else if (invalidPreparedStatement) {
            this.setState({
              invalidPreparedStatement: true,
            });
          } else if (mockMigrationDatabase) {
            this.setState({
              mockMigrationDatabase: true,
            });
          } else if (invalidDigitalTwinOutput) {
            this.setState({
              invalidDigitalTwinOutput: true,
            });
          }
          return;
        }

        // attach new redact rule UUIDs to state
        const maskingRuleValues = this.state.maskingRuleValues.map((r:RedactRule, idx:number) => {
          const rule = r;
          rule.key = data.redactRuleUuids[idx];
          return rule;
        });

        this.setState({
          showDialog: (data.updateHelmConfig) ? true : false,
          showSnackbar: (data.updateHelmConfig) ? false : true,
          maskingRuleValues,
          saveButtonDisabled: false,
          numInputs: this.state.inputs.length,
        });
      } catch (err) {
        // console.log('CATCH ERR', error);

        this.setState({
          saveButtonDisabled: false,
        });
      }
    } else {
      this.setState({
        saveButtonDisabled: false,
      });
    }
  }

  async hideHelmReminder() {
    if (this.state.helmReminderCheckbox) {
      // record acknowledgement of reminder (for embedded agent config feature)
      await fetch(`${this.context.apiUrl}/workflow/ackReminder`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.setState({
        ackHelmReminder: true,
        showDialog: false,
      });
    } else {
      this.setState({
        showDialog: false,
      });
    }
  }

  toggleHelmReminder(event:any) {
    this.setState({
      helmReminderCheckbox: event.target.checked,
    });
  }

  missingInput() {
    const inputs = this.state.inputs.find((input:WorkflowInputRecord) => {
      return (input.enabled === true && input.tableSelection)
    });
    return (inputs) ? false : true;
  }

  validateRedactionRules() {
    // skip validation if GUI disabled
    if (this.missingInput()) { return true; }

    const rules:string[] = [];
    let dupeRedactRuleFound = false;

    const validFields = this.state.maskingRuleValues.filter((rule:RedactRule) => {
      let missingFields:number = 0;

      if (rules.includes(`${rule.databaseTable}.${rule.table}.${rule.column}`)) {
        dupeRedactRuleFound = true;
      } else {
        rules.push(`${rule.databaseTable}.${rule.table}.${rule.column}`);
      }

      if (!rule.databaseTable) { missingFields++; }
      if (!rule.column) { missingFields++; }
      if (!rule.rule) { missingFields++; }

      if (missingFields === 1 || missingFields === 2 || !this.legalName(rule.column)) {
        // allow blanks and complete sets
        return rule;
      }

      return false;
    });

    const validRules = !((validFields.length || dupeRedactRuleFound));
    const completeRedactRules = !validFields.length;

    this.setState({
      completeRedactRules,
      dupeRedactRuleFound,
    });
    return validRules;
  }

  validateMigrationMockFields() {
    if (this.props.workflow.workflowType === "mockDatabaseMigration") {
      if (!this.props.workflow.migrationNamespace || !this.props.workflow.migrationDatabase || 
        !this.props.workflow.migrationDatabaseClone || !this.props.workflow.migrationConfiguration) {
        this.setState({
          invalidMigrationFields: true
        })
        return false;
      }
    }

    return true;
  }

  hideErrorDialog() {
    this.setState({
      completeRedactRules: true,
      dupeRedactRuleFound: false,
      dupeTableExportFound: false,
      validSchedule: true,
      validName: true,
      validDiskSize: true,
      missingSchemaSelection: false,
      missingPostExportHookField: false,
      missingSecretField: false,
      invalidOutputSettingField: false,
      orphanedWorkflow: false,
      invalidDeltaUpdate: false,
      invalidPreparedStatement: false,
      mockMigrationDatabase: false,
      invalidDigitalTwinOutput: false,
      invalidForgetUserFields: false,
      invalidMigrationFields: false,
    });
  }

  deleteMaskingRule(key:string) {
    const maskingRuleValues = this.state.maskingRuleValues.filter(
      (row:RedactRule) => (row.key !== key),
    );

    this.setState({
      numMaskingRules: (this.state.numMaskingRules - 1),
      maskingRuleValues,
    });
  }

  addMaskingRule() {
    const { maskingRuleValues } = this.state;

    const numMaskingRules = this.state.numMaskingRules + 1;
    const newRuleKey = this.state.newRuleKey + 1; // random array idx value
    maskingRuleValues.push({
      key: `new${newRuleKey}`,
      databaseTable: '',
      schema: 'public',
      table: '',
      column: '',
      rule: '',
    });

    this.setState({
      maskingRuleValues,
      numMaskingRules,
      newRuleKey,
    });
  }

  addTableSelection() {
    const state:IState = this.state;
    state.input.tables.push(localStorage.getItem("schema") || "public");
    this.setState(state);
  }

  deleteTableSelection(idx:number) {
    const state:IState = this.state;
    let table = state.input.tables[idx];

    state.input.tables = state.input.tables.filter((t:string) => {
      return (t !== table)
    })
    state.inputs = state.inputs.map((i:any) => {
      if (i.uuid === state.input.uuid) {
        return state.input;
      }
      return i;
    })
    this.setState(state);
  }

  handleSnackbarClose = () => {
    this.setState({
      showSnackbar: false,
      showSnackbarEdit: false,
      showClipboardSnackbar: false,
    });
  };

  deleteWorkflowConfirmation() {
    this.setState({
      deleteWorkflowConfirmation: true,
    });
  }

  cancelWorkflowConfirmation() {
    this.setState({
      deleteWorkflowConfirmation: false,
    });
  }

  displayLastReportedError() {
    return this.props.workflow.lastStackTrace ? this.props.workflow.lastStackTrace.split('\n').map((text:string, index:number) => <React.Fragment key={`${text}-${index}`}>
        {text}
        <br />
      </React.Fragment>) : '';
  }

  showLastReportedError(event:any) {
    event.preventDefault();

    this.setState({
      showLastReportedError: true,
    });
  }

  hideLastReportedError() {
    this.setState({
      showLastReportedError: false,
    });
  }

  static displayStatus(lastTask:string) {
    if (lastTask) {
      return (
        <Box mt={8}>
          <Typography variant="h6" gutterBottom>
            Status
          </Typography>

          Last task: <b>{lastTask}</b>
        </Box>
      );
    }

    return null;
  }

  // handleDataTableDelete(table:string) {
  //   const exportTableDataConfig = this.state.exportTableDataConfig.filter(
  //     (t:string) => t !== table,
  //   );

  //   this.setState({
  //     exportTableDataConfig,
  //   });
  // }

  handleCustomSecret(event:any, idx:number) {
    const state:IState = this.state;
    state.dataFeed.feedSecrets[idx][event.target.name] = event.target.value;

    this.setState({
      dataFeed: state.dataFeed,
    });
  }

  addSecret(secretType:string) {
    const state:IState = this.state;
    state.dataFeed.feedSecrets.push({
      secretType,
      secretName: '',
      secretKey: '',
      secretPath: '',
    });

    this.setState({
      dataFeed: state.dataFeed,
    });
  }

  handleDeleteSecret(idx:number) {
    const state:IState = this.state;
    state.dataFeed.feedSecrets = state.dataFeed.feedSecrets.filter(
      (secret:any, i:number) => i !== idx,
    );

    this.setState({
      dataFeed: state.dataFeed,
    });
  }

  handleExportSchedule(event:any) {
    if (event.target.value === 'false') {
      this.setState({
        exportSchedule: false,
        schedule: 'None',
      });
    } else {
      this.setState({
        exportSchedule: true,
        schedule: '* 0 * * *',
      });
    }
  }

  handleSchedule(event:any) {
    const state:any = {};
    if (event.target.name === 'scheduleSelection') {
      state.scheduleSelection = event.target.value;
      state.customSchedule = (event.target.value === 'custom');
    }
    state.schedule = (event.target.value === 'custom') ? '* 0 * * *' : event.target.value;
    this.setState(state);
  }

  handleDeltaUpdate(event:any) {
    this.setState({
      deltaUpdateField: event.target.value
    });
  }

  dbUUIDSnackbar() {
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
        message={<span id="message-id">{this.state.snackbarText}</span>}
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

  getExportFileNames() {
    const filenames:string[] = [];
    this.state.exportTableDataConfig.forEach((t:string) => {
      filenames.push(`table-${t}.csv`);
    });

    return filenames;
  }

  handleTableOutputChanges(event:any, table:string) {
    const state:IState = this.state;
    if (!table) {
      table = state.constraintSchema + "." + state.constraintTable;
    }
    if (!state.tableOutputOptions) {
      state.tableOutputOptions = {
        numDays: 30,
        sampleFields: "createdAndUpdated",
        createdAtField: "created_at",
        updatedAtField: "updated_at",
        disableDeltaUpdates: false,
      } 
    }

    if (event.target.name === "schema") {
      state.constraintSchema = event.target.value;
    }
    else if (event.target.name === "table") {
      state.constraintTable = event.target.value;
    }


    // transfer data that should be saved to exportTableDataConfig
    switch (event.target.name) {
      case 'createdAtField':
      case 'numDays':
      case 'sampleFields':
      case 'updatedAtField':
        state.tableOutputOptions[event.target.name] = event.target.value;
        break;

      case 'disableDeltaUpdates':
        state.tableOutputOptions[event.target.name] = event.target.checked;
        break;

      default:  
        break;
    }
    this.setState(state);
  }

  triggerEditInputDialog(input:WorkflowInputRecord) {
    // dereference
    let inputCopy:WorkflowInputRecord = {
      uuid: input.uuid,
      enabled: input.enabled,
      tables: input.tables,
      tableSelection: input.tableSelection,
    }
    this.setState({
      input: inputCopy,
      editInputDialog:true
    });
  }

  handleInputChanges(event:any, input:WorkflowInputRecord) {
    const state:any = this.state;
    console.log("INPUTS", state.inputs);
    const findInput = state.inputs.find((i:WorkflowInputRecord) => {
      return (i.uuid === input.uuid)
    });
    if (!findInput) {
      state.inputs.push(input);
    }
    state.inputs = state.inputs.map((i:any) => {
      if (i.uuid === input.uuid) {
        i[event.target.name] = (event.target.name === "enabled") ? event.target.checked : event.target.value;
        state.input[event.target.name] = i[event.target.name];
      }
      return i;
    })
    this.setState(state);
  }

  selectInputSource(event:any) {
    const state:any = this.state;
    const agentInput = this.props.agentInputs.find((input:AgentInputRecord) => {
      return (input.uuid === event.target.value)
    })
    if (agentInput) {
      state.inputs = [{
        uuid: event.target.value,
        enabled: true,
        inputName: agentInput.inputName,
        tables: [],
      }]
      this.setState(state);
    }
  }

  handleAddTable(event:any, idx:number, field:string) {
    const state:IState = this.state;
    if (field === "schema") {
      state.input.tables[idx] = event.target.value + "." + state.input.tables[idx].split('.')[1];
    }
    else if (field === "table") {
      state.input.tables[idx] = state.input.tables[idx].split('.')[0] + "." + event.target.value;
    }
    this.setState({
      input: state.input
    });
  }

  triggerAddTable() {
    const state:IState = this.state;
    state.errors.addTable = false;

    if (!state.addTable) {
      return;
    }
    else if (!this.legalName(this.state.addTable)) {
      state.errors.addTable = true;
      this.setState({
        errors: state.errors
      })
      return;
    }
    const input = this.state.input;
    if (!input.tables) {
      input.tables = [];
    }
    input.tables.push(this.state.addTable);

    this.setState({
      errors: state.errors,
      input:input,
      addTable:"",
    })
  }

  legalName(name:string) {
    // skip if no name is provided
    if (!name) { return true; }
    return (name.match(/^[a-zA-Z_][a-zA-Z0-9_]{1,30}$/)) ? true : false;
  }

  deleteWorkflow(input:WorkflowInputRecord) {
    const state:IState = this.state;
    state.inputs = state.inputs.filter((i:WorkflowInputRecord) => {
      return (i.uuid === input.uuid) ? false : true
    });

    const missingInput = this.missingInput();

    this.setState({
      transformExpanded: (missingInput) ? false : true,
      outputExpanded: (missingInput) ? false : true,
      inputs: state.inputs
    });
  }

  hideInputDialog() {
    this.setState({
      editInputDialog:false
    })
  }

  deleteDatabaseTable(table:string) {
    const input = this.state.input;
    if (!input.tables) {
      input.tables = [];
    }
    input.tables = input.tables.filter((t) => {
      return (table === t) ? false : true
    });

    this.setState({
      input:input
    })
  }

  handleEditWorkflowSnackbarClose = () => {
    this.setState({
      showSnackbarEdit: false,
    });
  };


  saveInputChanges() {
    const state:IState = this.state;
    let inputs:WorkflowInputRecord[] = this.state.inputs;

    if (!state.input.tables) {
      state.input.tables = [];
    }

    state.errors.JSX = null;

    // find and update existing input in inputs listing
    inputs = inputs.map((input) => {
      if (!input.tables) {
        input.tables = [];
      }

      if (input.uuid === this.state.input.uuid) {
        // check for valid table selection
        input.tables.forEach((t:string) => {
          let tableArr = t.split('.');
          let schema = tableArr[0];
          let table = tableArr[1];
          if (!schema) {
            state.errors.JSX = (
              <Alert mb={4} severity="error">A table selection is missing a schema</Alert>
            )
          }
          else if (!table) {
            state.errors.JSX = (
              <Alert mb={4} severity="error">A table selection is missing a table</Alert>
            )
          }
        });

        // transfer current input into inputs array
        return this.state.input;
      }

      return input;
    });

    state.numMaskingRules = state.maskingRuleValues.length;

    //console.log("INPUTS", inputs);
    //console.log("STATE", state)

    if (state.errors.JSX) {
      this.setState({
        errors: state.errors
      })
      return;
    }

    if (state.input.uuid.match(/^new/)) {
      this.setState({
        tableOutputOptions: state.tableOutputOptions,
        errors: state.errors,
        inputs: inputs,
        editInputDialog: false,
        showSnackbarEdit: true,
        newInputKey: state.newInputKey,
      })
    }
    else {
      this.setState({
        maskingRuleValues: state.maskingRuleValues,
        numMaskingRules: state.numMaskingRules,
        errors: state.errors,
        inputs: inputs,
        editInputDialog: false,
        showSnackbarEdit: true,
      })
    }
  }

  legalBucketName(bucket:string) {
    if (!bucket.match(/^[a-zA-Z0-9]{1}[a-zA-Z0-9.-]{1,61}[a-zA-Z0-9]{1}$/)) {
      return false;
    }
    else if (bucket.match(/^[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}$/)) {
      // IP address
      return false;
    }
    else if (bucket.match(/^xn--/) || bucket.match(/-s3alias$/)) {
      return false;
    }
    return true;
  }

  saveDataFeedChanges() {
    const state:IState = this.state;
    var errorsFound:boolean = false;
    var dataFeeds:DataFeed[] = this.state.dataFeeds;

    if (!state.dataFeed.dataFeed) {
      // no selection, close dialog
      this.setState({
        editDataFeed: false,
      })
      return; 
    }

    switch (state.dataFeed.dataFeed) {
      case 's3upload':
        if (!state.dataFeed.dataFeedConfig.S3UploadBucket || !this.legalBucketName(state.dataFeed.dataFeedConfig.S3UploadBucket)) {
          state.errors.invalidBucketName = true;
          errorsFound = true;
        }
        else {
          state.errors.invalidBucketName = false;
        }
      break;

      case 'digitalTwin':
        if (state.dataFeed.dataFeedConfig.enableDeltaUpdates && !state.dataFeed.dataFeedConfig.deltaUpdateField) {
          state.errors.invalidDeltaUpdateField = true;
          errorsFound = true;
        }
        if (state.dataFeed.dataFeedConfig.enablePostUpdatePreparedStatements && state.dataFeed.dataFeedConfig.postUpdateKeyValues.length) {
          // validate prepared statements
          const findInvalid = state.dataFeed.dataFeedConfig.postUpdateKeyValues.find((kv:PostUpdateParam) => {
            //eslint-disable-next-line
            return (!kv.key || !String(kv.value) || String(kv.key).match(/[%\(\)]+/) || String(kv.value).match(/[%\(\)]+/)) ? true : false;
          })
          if (findInvalid) {
            state.errors.invalidPostUpdateKeyValues = true;
            errorsFound = true;
          }
          else {
            state.errors.invalidPostUpdateKeyValues = false;
          }
        }
      break;

      case 'custom':
        if (!state.dataFeed.dataFeedConfig.image) {
          state.errors.image = true;
          errorsFound = true;
        }
        if (!state.dataFeed.dataFeedConfig.tag) {
          state.errors.tag = true;
          errorsFound = true;
        }
        if (!state.dataFeed.dataFeedConfig.shell) {
          state.errors.shell = true;
          errorsFound = true;
        }

        if (this.state.dataFeed.feedSecrets && this.state.dataFeed.feedSecrets.length) {
          this.state.dataFeed.feedSecrets.forEach((s: CustomSecret) => {
            if (s.secretType === 'volume' && (!s.secretName || !s.secretKey || !s.secretPath)) {
              state.errors.invalidSecret = true;
              errorsFound = true;
            } else if (s.secretType === 'env' && (!s.secretName || !s.secretKey || !s.envName)) {
              state.errors.invalidSecret = true;
              errorsFound = true;
            }
          });
        }

      break;

      default:
      break;
    }

    if (errorsFound) {
      this.setState({
        errors: state.errors,
      })
      return;
    }

    if (state.dataFeed.uuid === "new") {
      state.newDataFeedKey++;
      state.dataFeed.uuid = "new" + state.newDataFeedKey;

      dataFeeds.push(state.dataFeed);
    }
    else {
      // update existing datafeed
      dataFeeds = dataFeeds.map((df:DataFeed) => {
        if (df.uuid === state.dataFeed.uuid) {
          df.dataFeed = state.dataFeed.dataFeed;
          df.dataFeedConfig = state.dataFeed.dataFeedConfig;
          df.feedSecrets = state.dataFeed.feedSecrets;
        }
        return df;
      })
    }

    this.setState({
      dataFeeds,
      editDataFeed: false,
      showSnackbarEdit: true
    })
  }

  transformExpansion(event:any, expanded:boolean) {
    this.setState({
      transformExpanded: (expanded) ? true : false
    })
  }

  outputExpansion(event:any, expanded:boolean) {
    this.setState({
      outputExpanded: (expanded) ? true : false
    })
  }

  triggerOutputOptions(event:any, databaseTable:string) {
    const state:IState = this.state;
    if (!databaseTable) {
      state.constraintSchema = "public";
      state.constraintTable = "";
      state.tableOutputOptions = {
        errors: {},
        numDays: 30,
        sampleFields: "createdAndUpdated",
        createdAtField: "created_at",
        updatedAtField: "updated_at",
        disableDeltaUpdates: false,
      }
    }
    else {
      state.constraintSchema = databaseTable.split('.')[0];
      state.constraintTable = databaseTable.split('.')[1];
      state.tableOutputOptions = state.exportTableDataConfig.find((config:any) => {
        return config.table === databaseTable
      });
      state.tableOutputOptions.errors = {};
    }

    this.setState({
      currentDatabaseTable: databaseTable,
      tableOutputOptions: state.tableOutputOptions,
      constraintSchema: state.constraintSchema,
      constraintTable: state.constraintTable,
      showOutputOptions: true
    })
  }

  deleteConstraint(event:any, databaseTable:string) {
    const state:IState = this.state;
    state.exportTableDataConfig = state.exportTableDataConfig.filter((config:any) => {
      return (config.table !== databaseTable);
    });
    this.setState({
      exportTableDataConfig: state.exportTableDataConfig
    })
  }

  genConstraintSummary(table:string) {
    let display:string = "";
    let scheme:string = "";
    let findConfig = this.state.exportTableDataConfig.find((config:any) => {
      return config.table === table;
    });
    if (findConfig) {
      switch (findConfig.sampleFields) {
        case 'createdAndUpdated':
        scheme = "rows created and updated";
        break;

        case 'created':
        scheme = "rows created";
        break;

        case 'updated':
        scheme = "rows updated";
        break;
      }
      display = scheme + " in the last " + findConfig.numDays + " days";
    }
    return display;
  }

  hideOutputOptions() {
    const state:IState = this.state;
    if (!state.currentDatabaseTable && this.state.constraintSchema && this.state.constraintTable) {
      // new constraint
      state.tableOutputOptions.table = this.state.constraintSchema + "." + this.state.constraintTable;
      state.exportTableDataConfig.push(state.tableOutputOptions);
    }
    else if (this.state.constraintSchema && this.state.constraintTable) {
      // update existing
      state.exportTableDataConfig = state.exportTableDataConfig.map((config:any) => {
        if (config.table === state.currentDatabaseTable) {
          state.tableOutputOptions.table = this.state.constraintSchema + "." + this.state.constraintTable;
          return state.tableOutputOptions;
        }
        return config;
      });
    }

    //console.log("FINAL", state.exportTableDataConfig);

    this.setState({
      showOutputOptions: false,
      exportTableDataConfig: state.exportTableDataConfig,
    })
  }

  resetDataFeedErrors() {
    const state:IState = this.state;
    state.errors.duplicateDataFeed = false;
    state.errors.invalidBucketName = false;
    state.errors.invalidPostUpdateKeyValues = false;
    state.errors.invalidSecret = false;

    this.setState({
      errors: state.errors
    })
  }

  addDataFeed() {
    this.resetDataFeedErrors();
    const state:IState = this.state;

    state.dataFeed.uuid = "new";
    state.dataFeed.dataFeed = "";
    state.dataFeed.feedSecrets = [];

    this.setState({
      editDataFeed: true,
      dataFeed: state.dataFeed
    })
  }

  triggerEditDataFeed(df:DataFeed) {
    this.resetDataFeedErrors();
    const state:IState = this.state;

    const dataFeed = this.state.dataFeeds.filter((d:DataFeed) => {
      return (d.uuid === df.uuid) ? true : false;
    })

    // remove S3 prefix
    if (dataFeed[0].dataFeed === "s3upload") {
      dataFeed[0].dataFeedConfig.S3UploadBucket = dataFeed[0].dataFeedConfig.S3UploadBucket.replace(/^s3:\/\//,'');
    }
    if (!dataFeed[0].dataFeedConfig.postUpdateKeyValues) {
      dataFeed[0].dataFeedConfig.postUpdateKeyValues = [];
    }

    // dereference
    const dataFeedCopy:DataFeed = {
      uuid: dataFeed[0].uuid,
      dataFeed: dataFeed[0].dataFeed,
      dataFeedConfig: dataFeed[0].dataFeedConfig,
      feedSecrets: dataFeed[0].feedSecrets,
    }

    this.setState({
      editDataFeed: true,
      dataFeed: dataFeedCopy,
      errors: state.errors,
    })
  }

  hideDataFeed() {
    this.setState({
      editDataFeed: false
    })
  }

  handleDataFeed(dataFeed:string) {
    const state:IState = this.state;

    // prevent creation of duplicate data feed
    if (state.dataFeeds && state.dataFeeds.find((df:DataFeed) => {
      return (df.dataFeed === dataFeed) ? true : false
    })) {
      state.errors.duplicateDataFeed = true;
      state.dataFeed.dataFeed = "";
      this.setState({
        errors: state.errors,
        dataFeed: state.dataFeed,
      });
      return;
    }

    state.dataFeed.dataFeed = dataFeed;
    state.errors.duplicateDataFeed = false;

    // init config
    switch (dataFeed) {
      case 'digitalTwin':
      state.dataFeed.dataFeedConfig = {
        inputSource: "",
        enableSSL: false,
        enableDeltaUpdates: false,
        enablePostUpdatePreparedStatements: false,
        postUpdateKeyValues: [],
      }
      break;

      case 's3upload':
      state.dataFeed.dataFeedConfig = {
        postUpdateKeyValues: [],
      }
      break;

      case 'custom':
      state.dataFeed.dataFeedConfig = {
        image: "",
        tag: "",
        shell: "",
        command: "",
        postUpdateKeyValues: [],
      }
      break;
    }
    
    this.setState({
      dataFeed: state.dataFeed,
      errors: state.errors,
    })
  }

  handleDataFeedBack() {
    const state:IState = this.state;

    state.dataFeed.dataFeed = "";
    this.setState({
      dataFeed: state.dataFeed
    })
  }

  handleDataFeedCancel() {
    this.setState({
      editDataFeed: false
    })
  }

  addParameterValue() {
    const state:IState = this.state;
    state.dataFeed.dataFeedConfig.postUpdateKeyValues.push({
      key: "",
      value: ""
    })
    this.setState(state);
  }

  updateParameterValue(key:number, event:any) {
    const state:IState = this.state;
    state.dataFeed.dataFeedConfig.postUpdateKeyValues = state.dataFeed.dataFeedConfig.postUpdateKeyValues.map((kv:PostUpdateParam, idx:number) => {
      if (idx === key && event.target.name === "parameterKey") {
        kv.key = event.target.value;
      }
      else if (idx === key && event.target.name === "parameterValue") {
        kv.value = (!event.target.value || isNaN(event.target.value)) ? event.target.value : parseFloat(event.target.value);
      }
      return kv;
    })
    this.setState(state); 
  }

  deleteParameterValue(key:number) {
    const state:IState = this.state;
    state.dataFeed.dataFeedConfig.postUpdateKeyValues = state.dataFeed.dataFeedConfig.postUpdateKeyValues.filter((kv:PostUpdateParam, idx:number) => {
      return (idx === key) ? false : true;
    });
    this.setState(state);
  }

  deleteDataFeed(dataFeed:DataFeed) {
    const state:IState = this.state;
    state.dataFeeds = state.dataFeeds.filter((df:DataFeed) => {
      return (df.uuid === dataFeed.uuid) ? false : true;
    })

    this.setState({
      dataFeeds: state.dataFeeds,
      showSnackbarEdit: true
    })
  }

  handleDataFeedOptions(event:any) {
    const state:IState = this.state;
    state.dataFeed.dataFeedConfig[event.target.name] = (event.target.name.match(/^enable/)) ? event.target.checked : event.target.value;

    this.setState(state);
  }

  displayWorkflowType(wf:string) {
    switch (wf) {
      case 'ERL':
      return 'ERL (Extract, Redact, Load)';

      case 'mockDatabaseMigration':
      return 'Database Clone for Migration Dry-run';

      default:
      break;
    }
  }

  /* eslint-disable max-len */

  render() {
    return (
      <Card mb={6}>
        <CardContent>
          {this.dbUUIDSnackbar()}
          <Typography variant="h4">
            {this.props.workflow.name} <code>({this.props.workflow.uuid})</code>
            <Box display="inline" ml={2}>
              <CopyToClipboard text={this.props.workflow.uuid} onCopy={() => this.clipboardCopy("dbuuid")}>
                <Button variant="outlined" size="small" color="secondary"><ClipboardIcon /></Button>
              </CopyToClipboard>
            </Box>
          </Typography>

          <Box>
            <Grid
              container
              justify="space-between"
              alignItems="center"
            >
              <Grid item xs={4}>
                <Box display={(this.props.workflow.workflowType.match(/^(ERL|mockDatabaseMigration)/)) ? 'block' : 'none'}>
                  <FormControl margin="dense" fullWidth>
                    <InputLabel>
                      Redactics Agent
                    </InputLabel>
                    <Select
                      value={this.props.workflow.agentId}
                      name="agentId"
                      onChange={(event) => this.props.handleWFChanges(event, this.props.workflow.uuid)}
                    >
                      {this.props.agents.map((agent:AgentRecord) => (
                        <MenuItem key={agent.uuid} value={agent.uuid}>{agent.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box mt={4}>
                  Workflow Type: <b>{this.displayWorkflowType(this.props.workflow.workflowType)}</b>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Dialog
            open={this.state.showLastReportedError}
            onClose={this.hideLastReportedError}
            maxWidth="lg"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
          >
            <DialogTitle id="dialog-title">Last Reported Error for: {this.props.workflow.name}</DialogTitle>
            <DialogContent>
              <DialogContentText id="dialog-description">
                {this.displayLastReportedError()}
              </DialogContentText>

              <DialogActions>
                <Button color="primary" onClick={this.hideLastReportedError}>
                  Close
                </Button>
              </DialogActions>
            </DialogContent>
          </Dialog>

          <Box mt={12}>
            <Paper variant="outlined">
              <ExpansionPanel>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Input Settings</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  <WorkflowInputs
                    errors={this.state.errors}
                    workflow={this.props.workflow}
                    agentInputs={this.props.agentInputs}
                    agents={this.props.agents}
                    input={this.state.input}
                    inputs={this.state.inputs}
                    saveInputChanges={this.saveInputChanges}
                    selectInputSource={this.selectInputSource}
                    editInputDialog={this.state.editInputDialog}
                    triggerEditInputDialog={this.triggerEditInputDialog}
                    handleInputChanges={this.handleInputChanges}
                    handleAddTable={this.handleAddTable}
                    addTable={this.state.addTable}
                    triggerAddTable={this.triggerAddTable}
                    hideInputDialog={this.hideInputDialog}
                    deleteDatabaseTable={this.deleteDatabaseTable}
                    handleSnackbarClose={this.handleEditWorkflowSnackbarClose}
                    addTableSelection={this.addTableSelection}
                    deleteTableSelection={this.deleteTableSelection}
                  />
                </ExpansionPanelDetails>
              </ExpansionPanel>
            </Paper>
          </Box>
                  

          <Box mt={4} display={(this.props.workflow.workflowType.match(/^ERL/)) ? 'block' : 'none'}>
            <Paper variant="outlined">
              <ExpansionPanel disabled={this.missingInput()} expanded={!this.missingInput() && this.state.transformExpanded} onChange={(event, expanded) => this.transformExpansion(event, expanded)}>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Processing/Transformation Settings</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  <WorkflowRedactionRules
                    workflow={this.props.workflow}
                    allDatabaseTables={this.state.allDatabaseTables}
                    maskingRuleValues={this.state.maskingRuleValues}
                    handleRuleChange={this.handleRuleChange}
                    deleteMaskingRule={this.deleteMaskingRule}
                    numMaskingRules={this.state.numMaskingRules}
                    maskingRules={this.state.maskingRules}
                    addMaskingRule={this.addMaskingRule}
                  />

                  <WorkflowSchedule
                    handleExportSchedule={this.handleExportSchedule}
                    exportSchedule={this.state.exportSchedule}
                    schedule={this.state.schedule || '* 0 * * *'}
                    handleSchedule={this.handleSchedule}
                    scheduleSelection={this.state.scheduleSelection}
                    customSchedule={this.state.customSchedule}
                    workflowType={this.props.workflow.workflowType}
                    errors={this.state.errors}
                  />
                </ExpansionPanelDetails>
              </ExpansionPanel>
            </Paper>
          </Box>

          <Box mt={4} display={(this.props.workflow.workflowType.match(/^ERL/)) ? 'block' : 'none'}>
            <Paper variant="outlined">
              <ExpansionPanel disabled={(this.state.allDatabaseTables && this.state.allDatabaseTables.length) ? false : true} expanded={this.state.outputExpanded} onChange={(event, expanded) => this.outputExpansion(event, expanded)}>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Output Settings</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  <WorkflowExport
                    exportTableDataConfig={this.state.exportTableDataConfig}
                    showOutputOptions={this.state.showOutputOptions}
                    hideOutputOptions={this.hideOutputOptions}
                    triggerOutputOptions={this.triggerOutputOptions}
                    deleteConstraint={this.deleteConstraint}
                    currentDatabaseTable={this.state.currentDatabaseTable}
                    allDatabaseTables={this.state.allDatabaseTables}
                    tableOutputOptions={this.state.tableOutputOptions}
                    constraintSchema={this.state.constraintSchema}
                    constraintTable={this.state.constraintTable}
                    handleTableOutputChanges={this.handleTableOutputChanges}
                    genConstraintSummary={this.genConstraintSummary}
                  />

                  <WorkflowPostExport
                    inputs={this.state.inputs}
                    dataFeeds={this.state.dataFeeds}
                    dataFeed={this.state.dataFeed}
                    addParameterValue={this.addParameterValue}
                    updateParameterValue={this.updateParameterValue}
                    deleteParameterValue={this.deleteParameterValue}
                    agents={this.props.agents}
                    workflow={this.props.workflow}
                    hideDataFeed={this.hideDataFeed}
                    addDataFeed={this.addDataFeed}
                    editDataFeed={this.state.editDataFeed}
                    handleDataFeed={this.handleDataFeed}
                    handleDataFeedBack={this.handleDataFeedBack}
                    handleDataFeedCancel={this.handleDataFeedCancel}
                    handleDataFeedOptions={this.handleDataFeedOptions}
                    saveDataFeedChanges={this.saveDataFeedChanges}
                    triggerEditDataFeed={this.triggerEditDataFeed}
                    deleteDataFeed={this.deleteDataFeed}
                    errors={this.state.errors}
                    handleCustomSecret={this.handleCustomSecret}
                    addSecret={this.addSecret}
                    handleDeleteSecret={this.handleDeleteSecret}
                    agentNamespace={this.state.agentNamespace}
                  />
                </ExpansionPanelDetails>
              </ExpansionPanel>
            </Paper>
          </Box>

          <Box mt={4} display={(this.props.workflow.workflowType === "mockDatabaseMigration") ? 'block' : 'none'}>
            <Paper variant="outlined">
              <ExpansionPanel expanded={this.state.outputExpanded} onChange={(event, expanded) => this.outputExpansion(event, expanded)}>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Settings and Setup Instructions</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  <DatabaseMigrationSetup
                    workflow={this.props.workflow}
                    handleWFChanges={this.props.handleWFChanges}
                    inputs={this.state.inputs}
                    agentNamespace={this.state.agentNamespace || "default"}
                    clipboardCopy={this.clipboardCopy}
                  />
                </ExpansionPanelDetails>
              </ExpansionPanel>
            </Paper>
          </Box>

          <Grid
            container
            justify="space-between"
            alignItems="center"
            mt={12}
          >
            <Grid item xs={10}>
              <Button variant="contained" color="primary" size="large" disabled={this.state.saveButtonDisabled} onClick={() => this.saveChanges(this.props.workflow.uuid)}>
                <SaveIcon />&nbsp;Save Changes
              </Button>
            </Grid>
            <Grid item>
              <Button variant="contained" color="default" size="small" onClick={this.deleteWorkflowConfirmation}>
                <DeleteIcon />&nbsp;
                Delete Workflow
              </Button>
            </Grid>

            <Dialog
              open={this.state.deleteWorkflowConfirmation}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Delete Workflow</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  Are you sure you want to delete this workflow configuration?
                </DialogContentText>

                <DialogActions>
                  <Button onClick={this.cancelWorkflowConfirmation}>
                    Cancel
                  </Button>
                  <Button color="primary" onClick={() => this.props.deleteWorkflow(this.props.workflow.uuid)}>
                    Yes, delete
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={this.state.orphanedWorkflow}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  Workflow <b>{this.props.workflow.name}</b> is not associated with a Redactics Agent. Please correct this by selecting an agent in your workflow configuration.
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={!this.state.completeRedactRules}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  One or more of your redaction rules contains a blank value or invalid column name (field names must contain only letters, numbers and underscores and most start with a letter or underscore)
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={this.state.dupeRedactRuleFound}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  One or more of your redaction rules contains a duplicate table and column name
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={this.state.dupeTableExportFound}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  You&apos;ve already selected this table/column for export
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={this.state.missingSchemaSelection}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  You must provide some table names for schema export
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={this.state.missingPostExportHookField}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  You must provide valid custom data feed container info
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={this.state.missingSecretField}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  You must provide details about your secrets/environment variables
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={this.state.invalidOutputSettingField}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  One or more "created" or "updated" field settings are missing or contain illegal characters
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={this.state.invalidForgetUserFields}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  Your Forget User Request "Database and Table Name" or "Email Field" are either missing or contain an invalid field name (field names must contain only letters, numbers and underscores and most start with a letter or underscore).
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={this.state.invalidMigrationFields}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  Your Setup Instructions fields are missing one or more values.
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={!this.state.validSchedule}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  <p>
                    Your custom schedule is invalid. Please abide by the standard crontab format:
                  </p>

                  <p>
                    <b>
                      [minute](0-59)[hour](0-23)
                      [day of the month](1-31)
                      [month](1-12)
                      [day of the week](0-6)
                    </b>
                  </p>
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={this.state.mockMigrationDatabase}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  <p>
                    Your database and cloned database name cannot be identical.
                  </p>
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={this.state.invalidDigitalTwinOutput}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  <p>
                    You cannot designate a Digital Twin output that is also configured as an input source.
                  </p>
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={!this.state.validName}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  You must provide a workflow name
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={!this.state.validDiskSize}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Error</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  You must provide a disk space allocation for your input source
                </DialogContentText>

                <DialogActions>
                  <Button color="primary" onClick={this.hideErrorDialog}>
                    Okay
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>

            <Dialog
              open={this.state.showDialog}
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
            >
              <DialogTitle id="dialog-title">Your changes have been saved!</DialogTitle>
              <DialogContent>
                <DialogContentText id="dialog-description">
                  <Box>
                    However, your workflow will not work until you update your Helm configuration file,&nbsp;
                    which can be found in the <b>Agents</b> section.
                  </Box>
                </DialogContentText>

                <DialogActions>
                  <Button onClick={this.hideHelmReminder} color="primary" autoFocus>
                    Okay
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

            <Snackbar
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={this.state.showSnackbarEdit}
              autoHideDuration={8000}
              onClose={this.handleSnackbarClose}
              ContentProps={{
                'aria-describedby': 'message-id',
              }}
              message={<span id="message-id">Click on &quot;Save Changes&quot; at the bottom of this section to save your changes...</span>}
              action={[
                <IconButton
                  key="close"
                  aria-label="Close"
                  color="inherit"
                  onClick={this.handleSnackbarClose}
                >
                  <CloseIcon />
                </IconButton>
              ]}
            />
          </Grid>

        </CardContent>
      </Card>
    );
  }
}

export default withStyles(styles)(Workflow);

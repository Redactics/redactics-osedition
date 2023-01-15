import React from 'react';
import styled from 'styled-components';

import Helmet from 'react-helmet';

// import { red, green, blue } from "@material-ui/core/colors";
import { withStyles } from '@material-ui/core/styles';

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
  TextField as MuiTextField,
  Button as MuiButton,
  Card as MuiCard,
  CardContent,
  Box,
  FormControlLabel,
  Checkbox,
  Snackbar,
  IconButton,
  ExpansionPanel,
  ExpansionPanelDetails as MuiExpansionPanelDetails,
  ExpansionPanelSummary,
} from '@material-ui/core';

import {
  Add as AddIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
} from '@material-ui/icons';

import {
  Save as SaveIcon,
  Send as SendIcon,
} from 'react-feather';

import { spacing } from '@material-ui/system';
import RedacticsContext from '../../contexts/RedacticsContext';

import DefaultRedactEmail from './DefaultRedactEmail';
import DefaultReplacement from './DefaultReplacement';
import DefaultRandomString from './DefaultRandomString';
import Preset from './Preset';

import {
  RedactRuleSet, RedactRulePreset, RedactRuleConfig,
  RedactRuleDefault,
} from '../../types/redactics';

const Divider = styled(MuiDivider)(spacing);

const Card = styled(MuiCard)(spacing);

const FormControl = styled(MuiFormControl)(spacing);

const Grid = styled(MuiGrid)(spacing);

const TextFieldSpacing = styled(MuiTextField)(spacing);

const TextField = styled(TextFieldSpacing)`
  width: 300px;
`;

const Button = styled(MuiButton)(spacing);

const ExpansionPanelDetails = withStyles({
  root: {
    display: 'block',
  },
})(MuiExpansionPanelDetails);

/* eslint-disable @typescript-eslint/no-empty-interface */

interface IProps {}

interface IState {
  uniquePresetKey: number;
  incompletePreset: boolean;
  redactEmailDefault: RedactRuleDefault;
  redactReplacementDefault: RedactRuleDefault;
  redactRandomStringDefault: RedactRuleDefault;
  rulesets: RedactRuleSet[];
  presets: RedactRulePreset[];
  errors: any;
  isOwner: boolean;
  selectedPreset?: RedactRulePreset;
  saveDefaultRulesButtonDisabled: boolean;
  saveCustomPresetButtonDisabled: boolean;
  helmReminderCheckbox: boolean;
  ackHelmReminder: boolean;
  showSnackbar: boolean;
}

class Settings extends React.Component<IProps, IState> {
  static contextType = RedacticsContext;

  constructor(props: IProps) {
    super(props);

    this.state = {
      uniquePresetKey: 0,
      incompletePreset: false,
      rulesets: [],
      presets: [],
      errors: [],
      isOwner: false,
      saveDefaultRulesButtonDisabled: false,
      saveCustomPresetButtonDisabled: false,
      helmReminderCheckbox: false,
      ackHelmReminder: false,
      showSnackbar: false,
      redactEmailDefault: {
        redactData: {
          prefix: 'redacted',
          primaryKey: 'id',
          domain: 'redactics.com',
        },
        uuid: '',
      },
      redactReplacementDefault: {
        redactData: {
          replacement: 'redacted',
        },
        uuid: '',
      },
      redactRandomStringDefault: {
        redactData: {
          chars: 24,
        },
        uuid: '',
      },
    };

    this.refreshSettings = this.refreshSettings.bind(this);
    this.addPreset = this.addPreset.bind(this);
    this.saveDefaultRules = this.saveDefaultRules.bind(this);
    this.handleRedactEmailChange = this.handleRedactEmailChange.bind(this);
    this.handleReplacementChange = this.handleReplacementChange.bind(this);
    this.handleRandomStringChange = this.handleRandomStringChange.bind(this);
    this.handlePresetSave = this.handlePresetSave.bind(this);
    this.handlePresetDelete = this.handlePresetDelete.bind(this);
    this.handlePresetChange = this.handlePresetChange.bind(this);
    this.toggleExpandPanel = this.toggleExpandPanel.bind(this);
    this.validatePreset = this.validatePreset.bind(this);
    this.validateDefaultPreset = this.validateDefaultPreset.bind(this);
    this.hideErrorDialog = this.hideErrorDialog.bind(this);
  }

  async refreshSettings() {
    try {
      const response = await fetch(`${this.context.apiUrl}/settings`);

      const data = await response.json();

      const redactEmailDefault = data.defaults.find((d:RedactRuleSet) => d.rule === 'redact_email');
      const redactReplacementDefault = data.defaults.find((d:RedactRuleSet) => d.rule === 'replacement');
      const redactRandomStringDefault = data.defaults.find((d:RedactRuleSet) => d.rule === 'random_string');

      // assign keys to presets
      const presets:RedactRulePreset[] = [];
      data.presets.forEach((p:RedactRulePreset) => {
        presets.push({
          presetName: p.presetName,
          rule: p.rule,
          redactData: p.redactData,
          key: p.uuid,
          uuid: p.uuid,
        });
      });

      this.setState({
        redactEmailDefault,
        redactReplacementDefault,
        redactRandomStringDefault,
        rulesets: data.rulesets,
        presets,
        isOwner: data.isOwner,
      });
    } catch (err) {
      // console.log('CATCH ERR', error);
    }
  }

  componentDidMount() {
    // copy context data into component state
    this.setState({
      ackHelmReminder: this.context.ackHelmReminder,
    });

    this.refreshSettings();
  }

  handleRedactEmailChange(event:any) {
    const { redactEmailDefault } = this.state;
    if (redactEmailDefault && redactEmailDefault.redactData) {
      redactEmailDefault.redactData[
        event.target.name as keyof RedactRuleConfig
      ] = event.target.value;
      this.setState({
        redactEmailDefault,
      });
    }
  }

  handleReplacementChange(event:any) {
    const replacementDefault = this.state.redactReplacementDefault;
    if (replacementDefault && replacementDefault.redactData) {
      replacementDefault.redactData.replacement = event.target.value;
      this.setState({
        redactReplacementDefault: replacementDefault,
      });
    }
  }

  handleRandomStringChange(event:any) {
    const { redactRandomStringDefault } = this.state;
    if (redactRandomStringDefault && redactRandomStringDefault.redactData) {
      redactRandomStringDefault.redactData.chars = event.target.value;
      this.setState({
        redactRandomStringDefault,
      });
    }
  }

  handlePresetChange(key: string, event: any) {
    const { presets } = this.state;

    presets.map((preset:RedactRulePreset) => {
      const thisPreset = preset;
      if (thisPreset.key === key && event.target.name === 'rule') {
        // reset to defaults
        switch (event.target.value) {
          case 'redact_email':
            thisPreset.rule = 'redact_email';
            thisPreset.redactData = {
              prefix: 'redacted',
              primaryKey: 'id',
              domain: 'redacted.com',
            };
            break;

          case 'replacement':
            thisPreset.rule = 'replacement';
            thisPreset.redactData = {
              replacement: 'redacted',
            };
            break;

          case 'random_string':
            thisPreset.rule = 'random_string';
            thisPreset.redactData = {
              chars: 24,
            };
            break;

          default:
        }
      }

      switch (event.target.name) {
        case 'prefix':
        case 'primaryKey':
        case 'domain':
        case 'replacement':
        case 'chars':
          thisPreset.redactData[event.target.name as keyof RedactRuleConfig] = event.target.value;
          break;

        case 'presetName':
          thisPreset.presetName = event.target.value;
          break;

        default:
          break;
      }

      return thisPreset;
    });

    this.setState({
      presets,
    });
  }

  validateDefaultPreset(payload:any) {
    let incompletePreset = false;
    if (!payload[0].redactData.prefix || !payload[0].redactData.primaryKey
      || !payload[0].redactData.domain) {
      incompletePreset = true;
    } else if (!payload[1].redactData.replacement) {
      incompletePreset = true;
    } else if (!payload[2].redactData.chars) {
      incompletePreset = true;
    }
    this.setState({
      incompletePreset,
    });
    return !(incompletePreset);
  }

  validatePreset() {
    let incompletePreset = false;
    this.state.presets.forEach((p:RedactRulePreset) => {
      if (!p.presetName || !p.rule) {
        incompletePreset = true;
      } else if (p.rule === 'redact_email' && (!p.redactData.prefix || !p.redactData.primaryKey || !p.redactData.domain)) {
        incompletePreset = true;
      } else if (p.rule === 'replacement' && !p.redactData.replacement) {
        incompletePreset = true;
      } else if (p.rule === 'random_string' && !p.redactData.chars) {
        incompletePreset = true;
      }
    });
    this.setState({
      incompletePreset,
    });
    return !(incompletePreset);
  }

  hideErrorDialog() {
    this.setState({
      incompletePreset: false,
    });
  }

  async handlePresetSave() {
    if (this.validatePreset()) {
      this.setState({
        saveCustomPresetButtonDisabled: true,
      });

      try {
        await fetch(`${this.context.apiUrl}/settings/presets`, {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.state.presets),
        });

        // update all UUIDs tracked to state
        this.refreshSettings();

        // close all expansion panels
        const presets = this.state.presets.map((p:RedactRulePreset) => {
          const thisPreset = p;
          thisPreset.expanded = false;
          return thisPreset;
        });

        this.setState({
          showSnackbar: true,
          saveCustomPresetButtonDisabled: false,
          presets,
        });
      } catch (err) {
        this.setState({
          saveCustomPresetButtonDisabled: false,
        });
      }
    } else {
      this.setState({
        saveCustomPresetButtonDisabled: false,
      });
    }
  }

  handleSnackbarClose = () => {
    this.setState({ showSnackbar: false });
  };

  handlePresetDelete(preset:RedactRulePreset) {
    const uniquePresetKey = this.state.uniquePresetKey + 1; // random array idx value

    const presets = this.state.presets.filter((p:RedactRulePreset) => {
      const thisPreset = p;
      if (thisPreset.key === preset.key) {
        // mark for deletion
        thisPreset.key = `delete${uniquePresetKey}`;
      }

      return thisPreset;
    });

    this.setState({
      presets,
    });
  }

  addPreset() {
    const { presets } = this.state;
    const uniquePresetKey = this.state.uniquePresetKey + 1; // random array idx value

    presets.unshift({
      presetName: 'New Preset',
      rule: '',
      redactData: {},
      key: `new${uniquePresetKey}`,
      expanded: true,
    });

    this.setState({
      presets,
      uniquePresetKey,
    });
  }

  async saveDefaultRules() {
    this.setState({
      saveDefaultRulesButtonDisabled: true,
    });
    const payload:any = [];
    if (this.state.redactEmailDefault) {
      payload.push({
        uuid: this.state.redactEmailDefault.uuid,
        redactData: this.state.redactEmailDefault.redactData,
      });
    }
    if (this.state.redactReplacementDefault) {
      payload.push({
        uuid: this.state.redactReplacementDefault.uuid,
        redactData: this.state.redactReplacementDefault.redactData,
      });
    }
    if (this.state.redactRandomStringDefault) {
      payload.push({
        uuid: this.state.redactRandomStringDefault.uuid,
        redactData: this.state.redactRandomStringDefault.redactData,
      });
    }

    if (this.validateDefaultPreset(payload)) {
      try {
        await fetch(`${this.context.apiUrl}/settings/saveRuleDefaults`, {
          method: 'put',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        this.setState({
          showSnackbar: true,
          saveDefaultRulesButtonDisabled: false,
        });
      } catch (err) {
        // console.log('ERR', error);
      }
    } else {
      this.setState({
        saveDefaultRulesButtonDisabled: false,
      });
    }
  }

  toggleExpandPanel(event: any, preset:RedactRulePreset) {
    const presets = this.state.presets.map((p:RedactRulePreset) => {
      const thisPreset = p;
      if (thisPreset.key === preset.key) {
        thisPreset.expanded = !thisPreset.expanded;
      }

      return thisPreset;
    });

    this.setState({
      presets,
    });
  }

  /* eslint-disable max-len */

  render() {
    return (
      <React.Fragment>
        <Helmet title="Settings" />

        <Typography variant="h1" gutterBottom display="inline">
          Settings
        </Typography>

        <Divider my={6} />

        <Card mb={6}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Default Redaction Rule Settings
            </Typography>

            <Box mt={4}>
              <ExpansionPanel>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Redact Email</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  {
                    this.state.redactEmailDefault ? <DefaultRedactEmail ruleDefaults={this.state.redactEmailDefault} handleRedactEmailChange={this.handleRedactEmailChange} /> : ''
                  }
                </ExpansionPanelDetails>
              </ExpansionPanel>
              <ExpansionPanel>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Replacement</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  {
                    this.state.redactReplacementDefault ? <DefaultReplacement ruleDefaults={this.state.redactReplacementDefault} handleReplacementChange={this.handleReplacementChange} /> : ''
                  }
                </ExpansionPanelDetails>
              </ExpansionPanel>
              <ExpansionPanel>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Random String</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  {
                    this.state.redactRandomStringDefault ? <DefaultRandomString ruleDefaults={this.state.redactRandomStringDefault} handleRandomStringChange={this.handleRandomStringChange} /> : ''
                  }
                </ExpansionPanelDetails>
              </ExpansionPanel>
            </Box>

            <Button variant="contained" disabled={this.state.saveDefaultRulesButtonDisabled} color="primary" size="large" mt={8} onClick={this.saveDefaultRules}>
              <SaveIcon />&nbsp;Save Changes
            </Button>

          </CardContent>
        </Card>

        <Grid
          justify="flex-end"
          container
          spacing={10}
          mt={10}
        >

          <Grid item>
            <Button variant="contained" color="primary" onClick={this.addPreset}>
              <AddIcon />&nbsp;
              Add Preset
            </Button>
          </Grid>
        </Grid>

        <Card mb={6} mt={2}>
          <CardContent>

            <Typography variant="h4" gutterBottom>
              Custom Redaction Rule Presets
            </Typography>

            <Box width={1 / 2} mt={8}>
              <Typography variant="body1" gutterBottom>
                Redaction rule presets allow you to create reusable settings that can be set on your database fields while eliminating a lot of extra input. Simply define your preset here and it will appear as a redaction rule option in the Databases section of this app.
              </Typography>
            </Box>

            <Box mt={4}>
              {this.state.presets.map((preset: RedactRulePreset) => {
                if (preset.key && !preset.key.match(/^delete/)) {
                  return (
                    <ExpansionPanel
                      expanded={preset.expanded}
                      onChange={(event) => this.toggleExpandPanel(event, preset)}
                      key={preset.key}
                    >
                      <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">{preset.presetName}</Typography>
                      </ExpansionPanelSummary>
                      <ExpansionPanelDetails>
                        <Preset key={preset.key} rulesets={this.state.rulesets} selectedPreset={preset} handlePresetChange={this.handlePresetChange} deletePreset={this.handlePresetDelete} />
                      </ExpansionPanelDetails>
                    </ExpansionPanel>
                  );
                }

                return null;
              })}
            </Box>

            <Box mt={8}>
              <Button variant="contained" color="primary" size="large" disabled={this.state.saveCustomPresetButtonDisabled} onClick={this.handlePresetSave}>
                <SaveIcon />&nbsp;Save Changes
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Dialog
          open={this.state.incompletePreset}
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
        >
          <DialogTitle id="dialog-title">Error</DialogTitle>
          <DialogContent>
            <DialogContentText id="dialog-description">
              One or more of your preset rules contains a blank value
            </DialogContentText>

            <DialogActions>
              <Button color="primary" onClick={this.hideErrorDialog}>
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

      </React.Fragment>
    );
  }
}

export default Settings;

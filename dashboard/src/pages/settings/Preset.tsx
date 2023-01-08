import React from 'react';
import styled from 'styled-components';

// import { red, green, blue } from "@material-ui/core/colors";

import {
  FormControl as MuiFormControl,
  Grid as MuiGrid,
  TextField as MuiTextField,
  Button as MuiButton,
  Box,
  InputLabel,
  OutlinedInput,
  MenuItem,
  Select as MuiSelect,
} from '@material-ui/core';

import {
  DeleteOutline as DeleteIcon,
} from '@material-ui/icons';

import { spacing } from '@material-ui/system';

import PresetRedactEmail from './PresetRedactEmail';
import PresetReplacement from './PresetReplacement';
import PresetRandomString from './PresetRandomString';

import { SettingsRedactRulesets, RedactRulePreset } from '../../types/redactics';

const FormControl = styled(MuiFormControl)(spacing);

const Grid = styled(MuiGrid)(spacing);

const TextFieldSpacing = styled(MuiTextField)(spacing);

const TextField = styled(TextFieldSpacing)`
  width: 300px;
`;

const Button = styled(MuiButton)(spacing);

const SelectSpacing = styled(MuiSelect)(spacing);

const Select = styled(SelectSpacing)`
  width: 300px;
`;

interface IProps {
  rulesets: SettingsRedactRulesets[];
  selectedPreset: RedactRulePreset;
  handlePresetChange: any;
  deletePreset: any;
}

interface IState {
  ruleLabelWidth: number;
  rulesets: SettingsRedactRulesets[];
  preset: RedactRulePreset;
}

class Preset extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      ruleLabelWidth: 30,
      rulesets: this.props.rulesets,
      preset: this.props.selectedPreset,
    };

    this.resetPresetName = this.resetPresetName.bind(this);
  }

  resetPresetName() {
    const { preset } = this.state;
    if (preset.presetName === 'New Preset') {
      preset.presetName = '';
    }

    this.setState({
      preset,
    });
  }

  render() {
    return (
      <React.Fragment>

        <Box mt={6}>

          <FormControl fullWidth margin="normal" variant="outlined">
            <TextField
              value={this.state.preset.presetName}
              name="presetName"
              label="Preset Name"
              onChange={
                (event) => this.props.handlePresetChange(this.props.selectedPreset.key, event)
              }
              onFocus={this.resetPresetName}
            />
          </FormControl>

          <FormControl variant="outlined" margin="dense">
            <InputLabel>
              Rule
            </InputLabel>
            <Select
              value={this.state.preset.rule}
              onChange={
                (event) => this.props.handlePresetChange(this.props.selectedPreset.key, event)
              }
              name="rule"
              input={
                <OutlinedInput
                  labelWidth={this.state.ruleLabelWidth}
                  name="rule"
                />
              }
            >
              {this.state.rulesets.map((rule: SettingsRedactRulesets) => (
                <MenuItem key={rule.redactKey} value={rule.redactKey}>{rule.redactName}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box mt={4}>
            {
              this.state.preset.rule === 'redact_email' ? <PresetRedactEmail key={this.state.preset.key} handleChange={this.props.handlePresetChange} selectedPreset={this.state.preset} /> : ''
            }
            {
              this.state.preset.rule === 'replacement' ? <PresetReplacement key={this.state.preset.key} handleChange={this.props.handlePresetChange} selectedPreset={this.state.preset} /> : ''
            }
            {
              this.state.preset.rule === 'random_string' ? <PresetRandomString key={this.state.preset.key} handleChange={this.props.handlePresetChange} selectedPreset={this.state.preset} /> : ''
            }
          </Box>

          <Grid
            container
            justify="space-between"
            alignItems="center"
            mt={12}
          >
            <Grid item xs={10}></Grid>
            <Grid item>
                <Button variant="contained" color="default" size="small" onClick={(event) => this.props.deletePreset(this.state.preset, event)}>
                <DeleteIcon />&nbsp;&nbsp;Delete
              </Button>
            </Grid>
          </Grid>
        </Box>

      </React.Fragment>
    );
  }
}

export default Preset;

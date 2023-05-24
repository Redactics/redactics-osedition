import React from 'react';
import styled from 'styled-components';

// import { red, green, blue } from "@material-ui/core/colors";

import {
  FormControl as MuiFormControl,
  Typography,
  TextField as MuiTextField,
} from '@material-ui/core';

import { spacing } from '@material-ui/system';

import { RedactRulePreset } from '../../types/redactics';

const FormControl = styled(MuiFormControl)(spacing);

const TextFieldSpacing = styled(MuiTextField)(spacing);

const TextField = styled(TextFieldSpacing)`
  width: 300px;
`;

interface IProps {
  selectedPreset: RedactRulePreset;
  handleChange: any;
}

interface IState {
  key: string;
  prefix: string;
  domain: string;
}

/* eslint-disable max-len */

class PresetRedactEmail extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      key: this.props.selectedPreset.key || '',
      prefix: this.props.selectedPreset.redactData.prefix || 'redacted',
      domain: this.props.selectedPreset.redactData.domain || 'redactics.com',
    };
  }

  render() {
    return (
      <React.Fragment>

        <Typography variant="body1" gutterBottom>
          Transform emails to unique email address derived from a provided prefix, an automatically generated incrementing number, and domain - i.e. <code>[prefix][primarykey]@[domain]</code>
        </Typography>

        <form noValidate autoComplete="off">
          <FormControl fullWidth margin="normal" variant="outlined">
            <TextField
              onChange={(event) => this.props.handleChange(this.state.key, event)}
              name="prefix"
              label="Prefix"
              defaultValue={this.state.prefix}
            />
          </FormControl>

          <FormControl fullWidth margin="normal" variant="outlined">
            <TextField
              onChange={(event) => this.props.handleChange(this.state.key, event)}
              name="domain"
              label="Domain"
              defaultValue={this.state.domain}
            />
          </FormControl>

        </form>

      </React.Fragment>
    );
  }
}

export default PresetRedactEmail;

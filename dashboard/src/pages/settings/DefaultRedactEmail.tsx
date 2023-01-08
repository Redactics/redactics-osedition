import React from 'react';
import styled from 'styled-components';

// import { red, green, blue } from "@material-ui/core/colors";

import {
  FormControl as MuiFormControl,
  Typography,
  TextField as MuiTextField,
  Box,
} from '@material-ui/core';

import { spacing } from '@material-ui/system';

import { RedactRuleDefault } from '../../types/redactics';

const FormControl = styled(MuiFormControl)(spacing);

const TextFieldSpacing = styled(MuiTextField)(spacing);

const TextField = styled(TextFieldSpacing)`
  width: 300px;
`;

/* eslint-disable @typescript-eslint/no-empty-interface */

interface IProps {
  ruleDefaults: RedactRuleDefault;
  handleRedactEmailChange: any;
}

interface IState {}

class DefaultRedactEmail extends React.Component<IProps, IState> {
  /* eslint-disable max-len */

  render() {
    return (
      <React.Fragment>

        <Typography variant="body1" gutterBottom>
          Transform emails to unique email address derived from the row&apos;s primary key, constructed based on provided prefix and domain - i.e. <code>[prefix][primarykey]@[domain]</code>
        </Typography>

        <form noValidate autoComplete="off">
          <FormControl fullWidth margin="normal" variant="outlined">
            <TextField
              name="prefix"
              label="Prefix"
              value={this.props.ruleDefaults.redactData.prefix}
              onChange={this.props.handleRedactEmailChange}
            />
          </FormControl>

          <FormControl fullWidth margin="normal" variant="outlined">
            <TextField
              name="primaryKey"
              label="Primary Key"
              value={this.props.ruleDefaults.redactData.primaryKey}
              onChange={this.props.handleRedactEmailChange}
            />
          </FormControl>

          <FormControl fullWidth margin="normal" variant="outlined">
            <TextField
              name="domain"
              label="Domain"
              value={this.props.ruleDefaults.redactData.domain}
              onChange={this.props.handleRedactEmailChange}
            />
          </FormControl>

          <Box mt={4}>
            <Typography variant="body1" gutterBottom>
              <b>Sample Output</b>
            </Typography>

            <Typography variant="h6" gutterBottom>
              <code>{this.props.ruleDefaults.redactData.prefix}12345@{this.props.ruleDefaults.redactData.domain}</code>
            </Typography>

          </Box>
        </form>

      </React.Fragment>
    );
  }
}

export default DefaultRedactEmail;

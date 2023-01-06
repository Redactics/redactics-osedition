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
  handleReplacementChange: any;
}

interface IState {}

class DefaultReplacement extends React.Component<IProps, IState> {
  render() {
    return (
      <React.Fragment>

        <Typography variant="body1" gutterBottom>
          Replace data with a provided value
        </Typography>

        <form noValidate autoComplete="off">
          <FormControl fullWidth margin="normal" variant="outlined">
            <TextField
              name="replacement"
              label="Replacement Text"
              value={this.props.ruleDefaults.redactData.replacement}
              onChange={this.props.handleReplacementChange}
            />
          </FormControl>

          <Box mt={4}>
            <Typography variant="body1" gutterBottom>
              <b>Sample Output</b>
            </Typography>

            <Typography variant="h6" gutterBottom>
              <code>{this.props.ruleDefaults.redactData.replacement}</code>
            </Typography>

          </Box>
        </form>

      </React.Fragment>
    );
  }
}

export default DefaultReplacement;

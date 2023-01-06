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
  handleRandomStringChange: any;
}

interface IState {}

class DefaultRandomString extends React.Component<IProps, IState> {
  static generateRandom(length:number) {
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = length; i > 0; i -= 1) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }

  render() {
    const chars:number = this.props.ruleDefaults.redactData.chars as number || 24;
    return (
      <React.Fragment>

        <Typography variant="body1" gutterBottom>
          Replace data with a random alphanumeric string of a provided length
        </Typography>

        <form noValidate autoComplete="off">
          <FormControl fullWidth margin="normal" variant="outlined">
            <TextField
              name="randomString"
              label="Random String Character Length"
              value={this.props.ruleDefaults.redactData.chars}
              type="number"
              onChange={this.props.handleRandomStringChange}
            />
          </FormControl>

          <Box mt={4}>
            <Typography variant="body1" gutterBottom>
              <b>Sample Output</b>
            </Typography>

            <Typography variant="h6" gutterBottom>
              <code>
                {DefaultRandomString.generateRandom(chars)}
              </code>
            </Typography>

          </Box>
        </form>

      </React.Fragment>
    );
  }
}

export default DefaultRandomString;

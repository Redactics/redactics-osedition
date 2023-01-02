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
  chars: number;
}

class PresetRandomString extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      key: this.props.selectedPreset.key || '',
      chars: this.props.selectedPreset.redactData.chars || 24,
    };
  }

  render() {
    return (
      <React.Fragment>

        <Typography variant="body1" gutterBottom>
          Replace data with a random alphanumeric string of a provided length
        </Typography>

         <form noValidate autoComplete="off">
          <FormControl fullWidth margin="normal" variant="outlined">
            <TextField
              onChange={(event) => this.props.handleChange(this.state.key, event)}
              name="chars"
              label="Random String Character Length"
              defaultValue={this.state.chars}
              type="number"
            />
          </FormControl>

        </form>

      </React.Fragment>
    );
  }
}

export default PresetRandomString;

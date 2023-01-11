import React from 'react';

import { ContextObj } from '../types/redactics';
import RedacticsContext from '../contexts/RedacticsContext';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

interface IProps {
  component: any;
  layout: any;
  computedMatch: any;
}

interface IState {
  apiUrl: string;
  cliUrl?: string;
  cliVersion?: string;
}

class RedacticsRoute extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      apiUrl: '',
    };
  }

  componentDidMount() {
    this.setState({
      apiUrl,
    });
  }

  render() {
    const Component = this.props.component;
    const Layout = this.props.layout;

    const contextObj:ContextObj = this.state;

    return (
      <RedacticsContext.Provider value={contextObj}>
        <Layout>
          <Component params={this.props.computedMatch.params} />
        </Layout>
      </RedacticsContext.Provider>
    );
  }
}

export default RedacticsRoute;

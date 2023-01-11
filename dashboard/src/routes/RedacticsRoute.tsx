import React from 'react';

import { ContextObj } from '../types/redactics';
import RedacticsContext from '../contexts/RedacticsContext';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const wsUrl = process.env.REACT_APP_WEBSOCKETS_URL || 'ws://localhost:3010';

interface IProps {
  component: any;
  layout: any;
  computedMatch: any;
}

interface IState {
  apiUrl: string;
  wsUrl: string;
  cliUrl?: string;
  cliVersion?: string;
}

class RedacticsRoute extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      apiUrl: '',
      wsUrl: '',
    };
  }

  componentDidMount() {
    this.setState({
      apiUrl,
      wsUrl,
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

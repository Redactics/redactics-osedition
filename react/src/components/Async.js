import React from 'react';

import Loader from './Loader';

const sleep = (m) => new Promise((r) => setTimeout(r, m));

export default function asyncComponent(importComponent) {
  class AsyncComponent extends React.Component {
    constructor(props) {
      super(props);

      this.state = {
        component: null,
      };
    }

    async componentDidMount() {
      await sleep(150);

      const { default: component } = await importComponent();

      this.setState({
        component,
      });
    }

    render() {
      const C = this.state.component;

      return C ? <C {...this.props} /> : <Loader />;
    }
  }

  return AsyncComponent;
}

import React from 'react';

import {
  Layers as LayersIcon,
  Settings as SettingsIcon,
  Terminal as TerminalIcon,
} from 'react-feather';

import {
  SettingsInputComponent as InputSourcesIcon,
  List as ListIcon,
} from '@material-ui/icons';

import async from '../components/Async';

// Redactics components
const DataSources = async(() => import('../pages/datasources/Main'));
const Agents = async(() => import('../pages/agents/Main'));
const Workflows = async(() => import('../pages/workflows/Main'));
const JobListing = async(() => import('../pages/workflows/JobListing'));
const CLI = async(() => import('../pages/CLI/Main'));
const Settings = async(() => import('../pages/settings/Main'));

const dataSourcesRoutes = {
  id: 'Data Sources',
  path: '/',
  component: DataSources,
  icon: <InputSourcesIcon />,
};

const agentsRoutes = {
  id: 'Agents',
  path: '/agents',
  component: Agents,
  icon: <LayersIcon />,
};

const workflowsRoutes = {
  id: 'Workflows',
  path: '/workflows',
  icon: <ListIcon />,
  children: [
    {
      path: '/workflows/configs',
      name: 'Configurations',
      component: Workflows
    },
    {
      path: '/workflows/jobs',
      name: 'Jobs',
      component: JobListing
    }
  ]
};

const cliRoutes = {
  id: 'CLI',
  path: '/cli',
  component: CLI,
  icon: <TerminalIcon />,
};

const settingsRoutes = {
  id: 'Settings',
  path: '/settings',
  component: Settings,
  icon: <SettingsIcon />,
};

export const dashboard = [
  dataSourcesRoutes,
  agentsRoutes,
  workflowsRoutes,
  cliRoutes,
  settingsRoutes,
];

export default [
  dataSourcesRoutes,
  agentsRoutes,
  workflowsRoutes,
  cliRoutes,
  settingsRoutes,
];

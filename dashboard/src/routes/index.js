import React from 'react';

import {
  TrendingUp as TrendingUpIcon,
  Layers as LayersIcon,
  Settings as SettingsIcon,
  Terminal as TerminalIcon,
  Search as SearchIcon,
  Archive as ArchiveIcon,
} from 'react-feather';

import {
  SettingsInputComponent as InputSourcesIcon,
  List as ListIcon,
} from '@material-ui/icons';

import async from '../components/Async';

// Redactics components
const Inputs = async(() => import('../pages/inputs/Main'));
const Agents = async(() => import('../pages/agents/Main'));
const Workflows = async(() => import('../pages/workflows/Main'));
const JobListing = async(() => import('../pages/workflows/JobListing'));
const Developers = async(() => import('../pages/developers/Main'));
const Settings = async(() => import('../pages/settings/Main'));

const inputSourcesRoutes = {
  id: 'Input Sources',
  path: '/',
  component: Inputs,
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

const developersRoutes = {
  id: 'Developers',
  path: '/developers',
  component: Developers,
  icon: <TerminalIcon />,
};

const settingsRoutes = {
  id: 'Settings',
  path: '/settings',
  component: Settings,
  icon: <SettingsIcon />,
};

export const dashboard = [
  inputSourcesRoutes,
  agentsRoutes,
  workflowsRoutes,
  developersRoutes,
  settingsRoutes,
];

export default [
  inputSourcesRoutes,
  agentsRoutes,
  workflowsRoutes,
  developersRoutes,
  settingsRoutes,
];

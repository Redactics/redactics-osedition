import { Request } from "express"

export interface UserRecord {
  id?: number;
  uuid?: string;
  apiKey?: string;
  companyId?: number;
  email: string;
  password?: string;
  salt?: string;
  firstName: string;
  lastName: string;
  emailValidated: boolean;
}

export interface CompanyRecord {
  name: string;
  createdByUser?: number;
  primaryUseCase: string;
  tosAgree: number;
}

export interface CompanyUserRecord {
  userId: number;
  companyId: number;
}

export interface CompanyInviteRecord {
  companyId?: number;
  email: string;
}

export interface EmailValidationRecord {
  userId: number;
  context: string;
  expiresAt?: Date;
}

export interface RedactRulePresetRecord {
  companyId: number;
  ruleId: number;
  isDefault: boolean;
  presetName: string;
  redactData: any;
}

export interface RedactRuleSetRecord {
  redactKey: string;
  redactName: string;
}

export interface SetupState {
  configsCreated: boolean;
  agentInstalled: boolean;
  cliInstall: boolean;
  metricsFound: boolean;
  dataFeedFound: boolean;
  scanInitiated: boolean;
  forgetUserQueries: boolean;
  inviteUsers: boolean;
}

export interface MetricRecord {
  runId: number;
  createdAt: Date;
  metricValue: number;
}

export interface ScanFieldRecord {
  scanId: number;
  scanTableId: number;
  hippaFieldId: number;
  field: string;
  count: number;
  firstPrimaryKey: number;
}

export interface AgentRecord {
  companyId?: number;
  name: string;
  namespace: string;
  nodeSelector?: string;
  fernetKey?: string;
  webserverKey?: string;
  generatedAirflowDBPassword: string;
  generatedAirflowAPIPassword: string;
  configPath?: string;
  uuid?: string;
  lastHeartBeatDate?: Date;
  agentInstallationDate?: Date;
  lastAgentVersion?: string;
}

export interface HelmCmdRecord {
  agentId: number;
  uuid?: string;
  createdAt: Date;
  cmd: string;
  invokedBy?: number;
}

export interface WorkflowCreate {
  companyId: number;
  name: string;
  agentId?: number;
  workflowType: string;
  exportTableDataConfig: any;
}

export interface WorkflowUpdate {
  companyId?: number;
  name: string;
  agentId?: number;
  schedule?: string;
  deltaUpdateField?: string;
  // TODO: come up with more specific interface
  exportTableDataConfig?: any[];
  generateSoftDeleteQueries?: boolean;
  userSearchEmailField?: string;
  userSearchEmailDBTable?: string;
  userSearchEmailColumn?: string;
  migrationNamespace?: string;
  migrationDatabase?: string;
  migrationDatabaseClone?: string;
  migrationConfiguration?: string;
  migrationHelmHookWeight?: number;
}

export interface MaskingRule {
  presetUuid?: string;
  table: string;
  column: string;
  rule: string;
}

export interface RedactRuleRecord {
  companyId?: number;
  workflowId: number;
  databaseTable: string;
  table: string;
  column: string;
  ruleId: number;
  presetId?: number;
}

export interface InputRecord {
  id?: string;
  uuid?: string;
  companyId?: number;
  inputName: string;
  inputType?: string;
  diskSize?: number;
  enableSSL?: boolean;
  sslMode?: string;
  exportData: boolean;
}

export interface AgentInputRecord {
  agentId: number;
  inputId: number;
}

export interface WorkflowInputRecord {
  workflowId: number;
  inputId: number;
  enabled: boolean;
  tables: string[];
}

export interface AgentConnection {
  id: string;
  type: string;
  host: string;
  port: number;
  login: string;
  password: string;
  schema: string;
  enableSSL?: boolean;
  extra?: string;
  version?: string
}

export interface AirflowException {
  exception: string;
  stackTrace: string;
  workflowJobId: string;
}

export interface TaskStart {
  lastTask: string;
  lastTaskEndDate: Date;
}

export interface HelmCmdHistory {
  uuid: string;
  cmd: string;
  title: string;
}

export interface DataRepoRecord {
  revNumber: number;
  tables: string[];
}

export interface WorkflowJobRecord {
  companyId?: number;
  workflowId?: number;
  workflowType: string;
  status: string;
  currentTaskNum: number;
  totalTaskNum?: number;
  exception?: string;
  outputUrl?: string;
  lastTask?: string;
  lastTaskEnd?: Date;
}

export interface OutputMetadata {
  initialCopies: string[];
  deltaCopies: string[];
  copySummary: string[];
  schemaChangeDetected: string[];
  initialCopyConfirm: string[];
  missingDeltaUpdateField: boolean;
  agentInit: boolean;
}

export interface WorkflowJobListEntry {
  uuid: string;
  status: string;
  createdAt: Date;
  lastTaskEnd: Date;
  workflowType: string;
  outputSummary: string;
  outputLinks?: string[];
  outputMetadata?: OutputMetadata;
  exception?: string;
  stackTrace?: string;
  progress: number;
  workflowName?: string;
  workflowId?: string;
}

export interface RedacticsRequest extends Request {
  currentUser: UserRecord;
  token?: any;
}

export interface AuthInfo {
  //email?: string;
  dockerRegistryUrl?: string;
  chartMuseumUrl?: string;
  //companyId?: string;
  //apiKey?: string;
  ackHelmReminder?: boolean;
  ackErrorNotification?: boolean;
  cliUrl?: string;
  cliVersion?: string;
  //firebaseToken?: string;
}

export interface ContextObj {
  apiUrl: string;
  //isAuthenticated: boolean;
}

export interface SettingsRedactRulesets {
  redactKey: string;
  redactName: string;
}

export interface RedactRuleSet {
  rule: string;
  redactKey: string;
  redactName: string;
}

export interface RedactRule {
  uuid?: string;
  table: string;
  databaseTable: string;
  column: string;
  rule: string;
  presetUuid?: string;
  // UI fields
  key?: string;
  val?: string;
  presetName?: string;
  expanded?: boolean;
  redactData?: RedactRuleConfig;
}

export interface RedactRuleDefault {
  uuid: string;
  redactData: RedactRuleConfig;
}

export interface RedactRuleConfig {
  prefix?: string;
  primaryKey?: string;
  domain?: string;
  chars?: number;
  replacement?: string;
}

export interface RedactRulePreset {
  rule: string;
  presetName: string;
  presetUuid?: string;
  expanded?: boolean;
  redactData: RedactRuleConfig;
  uuid?: string;
  isDefault?: boolean;
  // UI fields
  key?: string;
  val?: string;
}

export interface AgentRecord {
  uuid: string;
  name: string;
  sampleAgent?: boolean;
  configPath: string;
  nodeSelector: string;
  namespace?: string;
  completeConfig: boolean;
  inputs?: string[];
  // .toISOString() used for display purposes
  agentInstallationDate: string;
  lastHeartBeatDate: string;
  lastAgentVersion: string;
}

// export interface AgentFirebaseRecord {
//   key: string;
//   firstHeartbeat: boolean;
//   heartbeat: boolean;
//   timestamp: number;
//   agentId: string;
//   exception?: string;
//   stackTrace?: string;
//   ack?: boolean;
//   agentName?: string;
//   databaseName?: string;
//   databaseId?: string;
// }

export interface CustomSecret {
  secretName: string;
  secretType: string;
  secretKey: string;
  envName?: string;
  secretPath?: string;
}

export interface WorkflowUpdate {
  name: string;
  agentId: string;
  workflowType: string;
  inputs: WorkflowInputRecord[];
  dataFeeds: DataFeed[];
  maskingRules: RedactRule[];
  schedule: string;
  deltaUpdateField?: string;
  migrationNamespace?: string;
  migrationDatabase?: string;
  migrationDatabaseClone?: string;
  migrationConfiguration?: string;
  migrationHelmHookWeight?: string;
  // TODO: table data config type
  exportTableDataConfig: any;
}

export interface WorkflowRecord extends WorkflowUpdate {
  uuid: string;
  lastStackTrace?: string;
  redactrules?: RedactRule[];
  inputs: WorkflowInputRecord[];
  datafeeds: DataFeed[];
  allDatabaseTables: string[];
  agentName: string;
}

export interface InputRecord {
  uuid: string;
  inputType: string;
  inputDisplayMode?: string;
  inputName: string;
  databaseType?: string;
  diskSize?: number;
  enableSSL?: boolean;
  sslMode?: string;
  exportData: boolean;
  //tables?: string[];
}

export interface AgentInputRecord {
  uuid: string;
  inputName: string;
}

export interface WorkflowInputRecord {
  uuid: string;
  inputName: string;
  enabled: boolean;
  tables: string[];
}

export interface DataFeed {
  uuid: string;
  dataFeed: string;
  dataFeedConfig: any;
  feedSecrets: any;
}

export interface AirflowConnections {
  id: string;
}

export interface HelmCmdHistory {
  uuid: string;
  title: string;
  cmd: string;
}

export interface OutputMetadata {
  initialCopies: string[];
  deltaCopies: string[];
  copySummary: string[];
}

export interface WorkflowJob {
  uuid: string;
  workflowId: string;
  workflowName: string;
  workflowType: string;
  status: string;
  progress: number;
  createdAt: Date;
  lastTaskEnd: Date;
  outputSummary: string;
  outputLinks: string[];
  outputMetadata?: OutputMetadata;
  exception: string;
  stackTrace: string;
}

export interface PostUpdateParam {
  key: string;
  value: string;
}

export interface NotificationRecord {
  uuid: string;
  acked: boolean;
  firstHeartbeat: boolean;
  exception: string;
  stackTrace: string;
  workflowId?: string;
  workflowName?: string;
  createdAt: Date;
}
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {Database} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';
import {Clause} from '@nozbe/watermelondb/QueryDescription';
import {Class} from '@nozbe/watermelondb/utils/common';

import type AppDataOperator from '@database/operator/app_data_operator';
import type ServerDataOperator from '@app/database/operator/server_data_operator';
import type {Config} from '@typings/database/models/servers/config';
import type {License} from '@typings/database/models/servers/license';
import type System from '@typings/database/models/servers/system';

import {DatabaseType} from './enums';

export type CreateServerDatabaseConfig = {
  dbName: string;
  dbType?: DatabaseType.DEFAULT | DatabaseType.SERVER;
  displayName?: string;
  serverUrl?: string;
};

export type RegisterServerDatabaseArgs = {
  databaseFilePath: string;
  displayName: string;
  serverUrl: string;
};

export type AppDatabase = {
  database: Database;
  operator: AppDataOperator;
};

export type ServerDatabase = {
  database: Database;
  operator: ServerDataOperator;
}

export type ServerDatabases = {
  [x: string]: ServerDatabase;
};

export type TransformerArgs = {
  action: string;
  database: Database;
  fieldsMapper?: (model: Model) => void;
  tableName?: string;
  value: RecordPair;
};

export type OperationArgs = {
  tableName: string;
  createRaws?: RecordPair[];
  updateRaws?: RecordPair[];
  deleteRaws?: Model[];
  transformer: (TransformerArgs) => Promise<Model>;
};

export type Models = Array<Class<Model>>;

// The elements needed to create a new database
export type CreateServerDatabaseArgs = {
  config: CreateServerDatabaseConfig;
  shouldAddToAppDatabase?: boolean;
};

export type HandleReactionsArgs = {
  prepareRecordsOnly: boolean;
  reactions: Reaction[];
};

export type HandleFilesArgs = {
  files: FileInfo[];
  prepareRecordsOnly: boolean;
};

export type HandlePostMetadataArgs = {
  metadatas: Metadata[];
  prepareRecordsOnly: boolean;
};

export type HandlePostsArgs = {
  orders: string[];
  previousPostId?: string;
  values: Post[];
};

export type SanitizeReactionsArgs = {
  database: Database;
  post_id: string;
  rawReactions: Reaction[];
};

export type ChainPostsArgs = {
  orders: string[];
  previousPostId: string;
  rawPosts: Post[];
};

export type SanitizePostsArgs = {
  orders: string[];
  posts: Post[];
};

export type IdenticalRecordArgs = {
  existingRecord: Model;
  newValue: RawValue;
  tableName: string;
};

export type RetrieveRecordsArgs = {
  database: Database;
  tableName: string;
  condition: Clause;
};

export type ProcessRecordsArgs = {
  createOrUpdateRawValues: RawValue[];
  deleteRawValues: RawValue[];
  tableName: string;
  fieldName: string;
  findMatchingRecordBy: (existing: Model, newElement: RawValue) => boolean;
};

export type HandleRecordsArgs = {
  findMatchingRecordBy: (existing: Model, newElement: RawValue) => boolean;
  fieldName: string;
  transformer: (TransformerArgs) => Promise<Model>;
  createOrUpdateRawValues: RawValue[];
  deleteRawValues?: RawValue[];
  tableName: string;
  prepareRecordsOnly: boolean;
};

export type RangeOfValueArgs = {
  raws: RawValue[];
  fieldName: string;
};

export type RecordPair = {
  record?: Model;
  raw: RawValue;
};

type PrepareOnly = {
    prepareRecordsOnly: boolean;
}

export type HandleInfoArgs = PrepareOnly & {
    info: AppInfo[];
}

export type HandleGlobalArgs = PrepareOnly & {
    global: IdValue[];
}

export type HandleRoleArgs = PrepareOnly & {
    roles: Role[];
}

export type HandleCustomEmojiArgs = PrepareOnly & {
    emojis: CustomEmoji[];
}

export type HandleSystemArgs = PrepareOnly & {
    systems: IdValue[];
}

export type HandleTOSArgs = PrepareOnly & {
    termOfService: TermsOfService[];
}

export type HandleMyChannelArgs = PrepareOnly & {
  myChannels: ChannelMembership[];
};

export type HandleChannelInfoArgs = PrepareOnly &{
  channelInfos: ChannelInfo[];
};

export type HandleMyChannelSettingsArgs = PrepareOnly & {
  settings: ChannelMembership[];
};

export type HandleChannelArgs = PrepareOnly & {
  channels: Channel[];
};

export type HandleMyTeamArgs = PrepareOnly & {
  myTeams: MyTeam[];
};

export type HandleSlashCommandArgs = PrepareOnly & {
    slashCommands: SlashCommand[];
};

export type HandleTeamSearchHistoryArgs = PrepareOnly &{
  teamSearchHistories: TeamSearchHistory[];
};

export type HandleTeamChannelHistoryArgs = PrepareOnly & {
  teamChannelHistories: TeamChannelHistory[];
};

export type HandleTeamArgs = PrepareOnly & {
    teams: Team[];
};

export type HandleGroupsInChannelArgs = PrepareOnly & {
  groupsInChannels: GroupChannel[];
};

export type HandleGroupsInTeamArgs = PrepareOnly &{
  groupsInTeams: GroupTeam[];
};

export type HandleGroupArgs = PrepareOnly & {
  groups: Group[];
};

export type HandleChannelMembershipArgs = PrepareOnly & {
  channelMemberships: ChannelMembership[];
};

export type HandleGroupMembershipArgs = PrepareOnly & {
  groupMemberships: GroupMembership[];
};

export type HandleTeamMembershipArgs = PrepareOnly & {
  teamMemberships: TeamMembership[];
};

export type HandlePreferencesArgs = PrepareOnly & {
  preferences: PreferenceType[];
};

export type HandleUsersArgs = PrepareOnly & {
    users: UserProfile[];
 };

export type HandleDraftArgs = PrepareOnly & {
  drafts: Draft[];
};

export type LoginArgs = {
  config: Partial<Config>;
  ldapOnly?: boolean;
  license: Partial<License>;
  loginId: string;
  mfaToken?: string;
  password: string;
};

export type LoadMeArgs = { user?: UserProfile; deviceToken?: string };

export type ServerUrlChangedArgs = {
  configRecord: System;
  licenseRecord: System;
  selectServerRecord: System;
  serverUrl: string;
};

export type GetDatabaseConnectionArgs = {
  serverUrl: string;
  connectionName?: string;
  setAsActiveDatabase: boolean;
}

export type ProcessRecordResults = {
    createRaws: RecordPair[];
    updateRaws: RecordPair[];
    deleteRaws: Model[];
}

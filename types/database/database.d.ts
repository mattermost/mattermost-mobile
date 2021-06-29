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

export type Models = Class<Model>[];

// The elements needed to create a new database
export type CreateServerDatabaseArgs = {
  config: CreateServerDatabaseConfig;
  shouldAddToAppDatabase?: boolean;
};

export type HandleReactionsArgs = {
  prepareRecordsOnly: boolean;
  reactions: RawReaction[];
};

export type HandleFilesArgs = {
  files: RawFile[];
  prepareRecordsOnly: boolean;
};

export type HandlePostMetadataArgs = {
  embeds?: { embed: RawEmbed[]; postId: string }[];
  images?: { images: Dictionary<PostImage>; postId: string }[];
  prepareRecordsOnly: boolean;
};

export type HandlePostsArgs = {
  orders: string[];
  previousPostId?: string;
  values: RawPost[];
};

export type SanitizeReactionsArgs = {
  database: Database;
  post_id: string;
  rawReactions: RawReaction[];
};

export type ChainPostsArgs = {
  orders: string[];
  previousPostId: string;
  rawPosts: RawPost[];
};

export type SanitizePostsArgs = {
  orders: string[];
  posts: RawPost[];
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
    info: RawInfo[]
}
export type HandleServersArgs = PrepareOnly & {
    servers: RawServers[]
}
export type HandleGlobalArgs = PrepareOnly & {
    global: RawGlobal[]
}

export type HandleRoleArgs = PrepareOnly & {
    roles: RawRole[]
}

export type HandleCustomEmojiArgs = PrepareOnly & {
    emojis: RawCustomEmoji[]
}

export type HandleSystemArgs = PrepareOnly & {
    systems: RawSystem[]
}

export type HandleTOSArgs = PrepareOnly & {
    termOfService: RawTermsOfService[]
}

export type HandleMyChannelArgs = PrepareOnly & {
  myChannels: RawMyChannel[];
};

export type HandleChannelInfoArgs = PrepareOnly &{
  channelInfos: RawChannelInfo[];
};

export type HandleMyChannelSettingsArgs = PrepareOnly & {
  settings: RawMyChannelSettings[];
};

export type HandleChannelArgs = PrepareOnly & {
  channels: RawChannel[];
};

export type HandleMyTeamArgs = PrepareOnly & {
  myTeams: RawMyTeam[];
};

export type HandleSlashCommandArgs = PrepareOnly & {
    slashCommands: RawSlashCommand[];
};

export type HandleTeamSearchHistoryArgs = PrepareOnly &{
  teamSearchHistories: RawTeamSearchHistory[];
};

export type HandleTeamChannelHistoryArgs = PrepareOnly & {
  teamChannelHistories: RawTeamChannelHistory[];
};

export type HandleTeamArgs = PrepareOnly & {
    teams: RawTeam[];
};

export type HandleGroupsInChannelArgs = PrepareOnly & {
  groupsInChannels: RawGroupsInChannel[];
};

export type HandleGroupsInTeamArgs = PrepareOnly &{
  groupsInTeams: RawGroupsInTeam[];
};

export type HandleGroupArgs = PrepareOnly & {
  groups: RawGroup[];
};

export type HandleChannelMembershipArgs = PrepareOnly & {
  channelMemberships: RawChannelMembership[];
};

export type HandleGroupMembershipArgs = PrepareOnly & {
  groupMemberships: RawGroupMembership[];
};

export type HandleTeamMembershipArgs = PrepareOnly & {
  teamMemberships: RawTeamMembership[];
};

export type HandlePreferencesArgs = PrepareOnly & {
  preferences: RawPreference[];
};

export type HandleUsersArgs = PrepareOnly & {
    users: RawUser[];
 };

export type HandleDraftArgs = PrepareOnly & {
  drafts: RawDraft[];
};

export type LoginArgs = {
  config: Partial<Config>;
  ldapOnly?: boolean;
  license: Partial<License>;
  loginId: string;
  mfaToken?: string;
  password: string;
};

export type LoadMeArgs = { user?: RawUser; deviceToken?: string };

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

export type RawGlobal = {
  name: string;
  value: string;
};

export type RawInfo = {
  build_number: string;
  created_at: number;
  version_number: string;
};

export type RawServers = {
  db_path: string;
  display_name: string;
  mention_count: number;
  unread_count: number;
  url: string;
  isSecured: boolean;
  lastActiveAt: number;
};

export type RawChannelInfo = {
  channel_id: string;
  guest_count: number;
  header: string;
  member_count: number;
  pinned_post_count: number;
  purpose: string;
};

export type RawChannelMembership = {
  id? : string;
  channel_id: string;
  user_id: string;
  roles: string;
  last_viewed_at: number;
  msg_count: number;
  mention_count: number;
  notify_props: {
    desktop: string;
    email: string;
    ignore_channel_mentions: string;
    mark_unread: string;
    push: string;
  };
  last_update_at: number;
  scheme_guest: boolean;
  scheme_user: boolean;
  scheme_admin: boolean;
  explicit_roles: string;
};

export type ChannelType = 'D' | 'O' | 'G' | 'P';

export type RawChannel = {
  create_at: number;
  creator_id: string;
  delete_at: number;
  display_name: string;
  extra_update_at: number;
  group_constrained: boolean | null;
  header: string;
  id: string;
  last_post_at: number;
  name: string;
  props: Record<string, any> | null;
  purpose: string;
  scheme_id: string | null;
  shared: boolean | null;
  team_id: string;
  total_msg_count: number;
  type: ChannelType;
  update_at: number;
};

export type RawCustomEmoji = {
  id: string;
  name: string;
  create_at?: number;
  update_at?: number;
  delete_at?: number;
  creator_id: string;
};

export type RawDraft = {
  channel_id: string;
  files?: FileInfo[];
  message?: string;
  root_id: string;
};

export type RawFile = {
  create_at: number;
  delete_at: number;
  extension: string;
  has_preview_image?: boolean;
  height: number;
  id?: string;
  localPath?: string;
  mime_type?: string;
  mini_preview?: string; // thumbnail
  name: string;
  post_id: string;
  size: number;
  update_at: number;
  user_id: string;
  width?: number;
};

export type RawGroupMembership = {
  id?: string;
  user_id: string;
  group_id: string;
};

export type RawGroup = {
  create_at: number;
  delete_at: number;
  description: string;
  display_name: string;
  has_syncables: boolean;
  id: string;
  name: string;
  remote_id: string;
  source: string;
  update_at: number;
};

export type RawGroupsInChannel = {
  auto_add: boolean;
  channel_display_name: string;
  channel_id: string;
  channel_type: string;
  create_at: number;
  delete_at: number;
  group_id: string;
  team_display_name: string;
  team_id: string;
  team_type: string;
  update_at: number;
  member_count: number;
  timezone_count: number;
};

export type RawGroupsInTeam = {
  auto_add: boolean;
  create_at: number;
  delete_at: number;
  group_id: string;
  team_display_name: string;
  team_id: string;
  team_type: string;
  update_at: number;
};

export type RawMyChannelSettings = {
  notify_props: NotifyProps;
  channel_id: string;
};

export type RawMyChannel = {
  channel_id: string;
  last_post_at: number;
  last_viewed_at: number;
  mentions_count: number;
  message_count: number;
  roles: string;
};

export type RawMyTeam = {
  team_id: string;
  roles: string;
  is_unread: boolean;
  mentions_count: number;
};

export type RawEmbed = { data: {}; type: string; url: string };

export type RawPostMetadata = {
  data: any;
  type: string;
  postId: string;
};

export interface PostMetadataTypes {
  embeds: PostEmbed;
  images: Dictionary<PostImage>;
}

export interface PostEmbed {
  type: PostEmbedType;
  url: string;
  data: Record<string, any>;
}

export interface PostImage {
  height: number;
  width: number;
  format?: string;
  frame_count?: number;
}

export interface PostImageMetadata extends PostImage {
  url: string;
}

export type PostMetadataData = Record<string, any> | PostImageMetadata;

export type PostMetadataType = 'images' | 'embeds';

// The RawPost describes the shape of the object received from a getPosts request
export type RawPost = {
  channel_id: string;
  create_at: number;
  delete_at: number;
  edit_at: number;
  file_ids?: string[];
  filenames?: string[];
  hashtags: string;
  id: string;
  is_pinned?: boolean;
  last_reply_at?: number;
  message: string;
  original_id: string;
  parent_id: string;
  participants?: null;
  pending_post_id: string;
  prev_post_id?: string; // taken from getPosts API call; outside of post object
  props: object;
  reply_count?: number;
  root_id: string;
  type: string;
  update_at: number;
  user_id: string;
  metadata?: {
    embeds?: RawEmbed[];
    emojis?: RawCustomEmoji[];
    files?: RawFile[];
    images?: Dictionary<PostImage>;
    reactions?: RawReaction[];
  };
};

export type RawPostsInChannel = {
  channel_id: string;
  earliest: number;
  latest: number;
};

export type RawPostsInThread = {
  earliest: number;
  latest?: number;
  post_id: string;
};

export type RawPreference = {
  category: string;
  name: string;
  user_id: string;
  value: string;
};

export type RawReaction = {
  id? : string;
  create_at: number;
  delete_at: number;
  emoji_name: string;
  post_id: string;
  update_at: number;
  user_id: string;
};

export type RawRole = {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  permissions: string[];
  scheme_managed?: boolean;
};

export type RawSlashCommand = {
  id: string;
  auto_complete: boolean;
  auto_complete_desc: string;
  auto_complete_hint: string;
  create_at: number;
  creator_id: string;
  delete_at: number;
  description: string;
  display_name: string;
  icon_url: string;
  method: string;
  team_id: string;
  token: string;
  trigger: string;
  update_at: number;
  url: string;
  username: string;
};

export type RawSystem = {
  id?: string;
  name: string;
  value: string;
};

export type RawTeamChannelHistory = {
  team_id: string;
  channel_ids: string[];
};

export type RawTeamMembership = {
  id? : string;
  delete_at: number;
  explicit_roles: string;
  roles: string;
  scheme_admin: boolean;
  scheme_guest: boolean;
  scheme_user: boolean;
  team_id: string;
  user_id: string;
};

export type RawTeamSearchHistory = {
  created_at: number;
  display_term: string;
  term: string;
  team_id: string;
};

export type RawTeam = {
  id: string;
  allow_open_invite: boolean;
  allowed_domains: string;
  company_name: string;
  create_at: number;
  delete_at: number;
  description: string;
  display_name: string;
  email: string;
  group_constrained: boolean | null;
  invite_id: string;
  last_team_icon_update: number;
  name: string;
  scheme_id: string;
  type: string;
  update_at: number;
};

export type RawTermsOfService = {
  id: string;
  accepted_at: number;
  create_at: number;
  user_id: string;
  text: string;
};

export type RawUser = {
  id: string;
  auth_service: string;
  create_at: number;
  delete_at: number;
  email: string;
  email_verified: boolean;
  failed_attempts?: number;
  first_name: string;
  is_bot: boolean;
  last_name: string;
  last_password_update: number;
  last_picture_update: number;
  locale: string;
  mfa_active?: boolean;
  nickname: string;
  notify_props: {
    channel: boolean;
    desktop: string;
    desktop_sound: boolean;
    email: boolean;
    first_name: boolean;
    mention_keys: string;
    push: string;
    auto_responder_active: boolean;
    auto_responder_message: string;
    desktop_notification_sound: string; // Not in use by the mobile app
    push_status: string;
    comments: string;
  };
  position?: string;
  props: UserProps;
  roles: string;
  timezone: {
    useAutomaticTimezone: string;
    manualTimezone: string;
    automaticTimezone: string;
  };
  terms_of_service_create_at?: number;
  terms_of_service_id?: string;
  update_at: number;
  username: string;
};

export type RawValue =
  | RawInfo
  | RawChannel
  | RawChannelInfo
  | RawChannelMembership
  | RawCustomEmoji
  | RawDraft
  | RawFile
  | RawGlobal
  | RawGroup
  | RawGroupMembership
  | RawGroupsInChannel
  | RawGroupsInTeam
  | RawMyChannel
  | RawMyChannelSettings
  | RawMyTeam
  | RawPost
  | RawPostMetadata
  | RawPostsInChannel
  | RawPostsInThread
  | RawPreference
  | RawReaction
  | RawRole
  | RawServers
  | RawSlashCommand
  | RawSystem
  | RawTeam
  | RawTeamChannelHistory
  | RawTeamMembership
  | RawTeamSearchHistory
  | RawTermsOfService
  | RawUser;

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export enum OperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum IsolatedEntities {
  APP = 'app',
  CUSTOM_EMOJI = 'CustomEmoji',
  GLOBAL = 'global',
  SERVERS = 'servers',
  ROLE = 'Role',
  SYSTEM = 'System',
  TERMS_OF_SERVICE = 'TermsOfService',
}

// The only two types of databases in the app
export enum DatabaseType {
  DEFAULT,
  SERVER,
}

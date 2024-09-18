// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {UserMentionSections} from './types';
import type GroupModel from '@typings/database/models/servers/group';
import type UserModel from '@typings/database/models/servers/user';

export const SECTION_KEY_TEAM_MEMBERS = 'teamMembers';
export const SECTION_KEY_IN_CHANNEL = 'inChannel';
export const SECTION_KEY_OUT_OF_CHANNEL = 'outChannel';
export const SECTION_KEY_SPECIAL = 'special';
export const SECTION_KEY_GROUPS = 'groups';

export const emptyUserlList: Array<UserModel | UserProfile> = [];
export const emptySectionList: UserMentionSections = [];
export const emptyGroupList: GroupModel[] = [];

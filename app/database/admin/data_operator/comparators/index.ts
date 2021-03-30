// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {App} from '@database/default/models';
import {Role, User} from '@database/server/models';
import ChannelMembership from '@typings/database/channel_membership';
import CustomEmoji from '@typings/database/custom_emoji';
import {
    RawApp,
    RawChannelMembership,
    RawCustomEmoji,
    RawDraft,
    RawGlobal,
    RawGroup,
    RawGroupMembership,
    RawPost,
    RawPreference,
    RawRole,
    RawServers,
    RawSystem,
    RawTeamMembership,
    RawTermsOfService,
    RawUser,
} from '@typings/database/database';
import Draft from '@typings/database/draft';
import Global from '@typings/database/global';
import Group from '@typings/database/group';
import GroupMembership from '@typings/database/group_membership';
import Post from '@typings/database/post';
import Preference from '@typings/database/preference';
import Servers from '@typings/database/servers';
import System from '@typings/database/system';
import TeamMembership from '@typings/database/team_membership';
import TermsOfService from '@typings/database/terms_of_service';

/**
 *  This file contains all the comparators that are used by the handlers to find out which records to truly update and
 *  which one to create.  A 'record' is a model in our database and a 'raw' is the object that is passed to the handler
 *  (e.g. API response). Each comparator will return a boolean condition after comparing specific fields from the
 *  'record' and the 'raw'
 */

export const compareAppRecord = (record: App, raw: RawApp) => {
    return (
        raw.buildNumber === record.buildNumber &&
        raw.createdAt === record.createdAt &&
        raw.versionNumber === record.versionNumber
    );
};

export const compareGlobalRecord = (record: Global, raw: RawGlobal) => {
    return raw.name === record.name && raw.value === record.value;
};

export const compareServerRecord = (record: Servers, raw: RawServers) => {
    return raw.url === record.url && raw.dbPath === record.dbPath;
};

export const compareRoleRecord = (record: Role, raw: RawRole) => {
    return raw.name === record.name && raw.permissions === record.permissions;
};

export const compareSystemRecord = (record: System, raw: RawSystem) => {
    return raw.name === record.name && raw.value === record.value;
};

export const compareTermsOfServiceRecord = (record: TermsOfService, raw: RawTermsOfService) => {
    return raw.acceptedAt === record.acceptedAt;
};

export const compareDraftRecord = (record: Draft, raw: RawDraft) => {
    return raw.channel_id === record.channelId;
};

export const comparePostRecord = (record: Post, raw: RawPost) => {
    return raw.id === record.id;
};

export const compareUserRecord = (record: User, raw: RawUser) => {
    return raw.id === record.id;
};

export const comparePreferenceRecord = (record: Preference, raw: RawPreference) => {
    return (
        raw.category === record.category &&
        raw.name === record.name &&
        raw.user_id === record.userId &&
        raw.value === record.value
    );
};

export const compareTeamMembershipRecord = (record: TeamMembership, raw: RawTeamMembership) => {
    return raw.team_id === record.teamId && raw.user_id === record.userId;
};

export const compareCustomEmojiRecord = (record: CustomEmoji, raw: RawCustomEmoji) => {
    return raw.name === record.name;
};

export const compareGroupMembershipRecord = (record: GroupMembership, raw: RawGroupMembership) => {
    return raw.user_id === record.userId && raw.group_id === record.groupId;
};

export const compareChannelMembershipRecord = (record: ChannelMembership, raw: RawChannelMembership) => {
    return raw.user_id === record.userId && raw.channel_id === record.channelId;
};

export const compareGroupRecord = (record: Group, raw: RawGroup) => {
    return raw.name === record.name && raw.display_name === record.displayName;
};

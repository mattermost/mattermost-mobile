// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import App from '@typings/database/app';
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
    RawGroupsInChannel,
    RawGroupsInTeam,
    RawMyTeam,
    RawPost,
    RawPreference,
    RawRole,
    RawServers,
    RawSlashCommand,
    RawSystem,
    RawTeam,
    RawTeamChannelHistory,
    RawTeamMembership,
    RawTeamSearchHistory,
    RawTermsOfService,
    RawUser,
} from '@typings/database/database';
import Draft from '@typings/database/draft';
import Global from '@typings/database/global';
import Group from '@typings/database/group';
import GroupMembership from '@typings/database/group_membership';
import GroupsInChannel from '@typings/database/groups_in_channel';
import GroupsInTeam from '@typings/database/groups_in_team';
import MyTeam from '@typings/database/my_team';
import Post from '@typings/database/post';
import Preference from '@typings/database/preference';
import Role from '@typings/database/role';
import Servers from '@typings/database/servers';
import SlashCommand from '@typings/database/slash_command';
import System from '@typings/database/system';
import Team from '@typings/database/team';
import TeamChannelHistory from '@typings/database/team_channel_history';
import TeamMembership from '@typings/database/team_membership';
import TeamSearchHistory from '@typings/database/team_search_history';
import TermsOfService from '@typings/database/terms_of_service';
import User from '@typings/database/user';

/**
 *  This file contains all the comparators that are used by the handlers to find out which records to truly update and
 *  which one to create.  A 'record' is a model in our database and a 'raw' is the object that is passed to the handler
 *  (e.g. API response). Each comparators will return a boolean condition after comparing specific fields from the
 *  'record' and the 'raw'
 */

export const isRecordAppEqualToRaw = (record: App, raw: RawApp) => {
    return (
        raw.buildNumber === record.buildNumber &&
        raw.createdAt === record.createdAt &&
        raw.versionNumber === record.versionNumber
    );
};

export const isRecordGlobalEqualToRaw = (record: Global, raw: RawGlobal) => {
    return raw.name === record.name && raw.value === record.value;
};

export const isRecordServerEqualToRaw = (record: Servers, raw: RawServers) => {
    return raw.url === record.url && raw.dbPath === record.dbPath;
};

export const isRecordRoleEqualToRaw = (record: Role, raw: RawRole) => {
    return raw.name === record.name && JSON.stringify(raw.permissions) === JSON.stringify(record.permissions);
};

export const isRecordSystemEqualToRaw = (record: System, raw: RawSystem) => {
    return raw.name === record.name && raw.value === record.value;
};

export const isRecordTermsOfServiceEqualToRaw = (record: TermsOfService, raw: RawTermsOfService) => {
    return raw.acceptedAt === record.acceptedAt;
};

export const isRecordDraftEqualToRaw = (record: Draft, raw: RawDraft) => {
    return raw.channel_id === record.channelId;
};

export const isRecordPostEqualToRaw = (record: Post, raw: RawPost) => {
    return raw.id === record.id;
};

export const isRecordUserEqualToRaw = (record: User, raw: RawUser) => {
    return raw.id === record.id;
};

export const isRecordPreferenceEqualToRaw = (record: Preference, raw: RawPreference) => {
    return (
        raw.category === record.category &&
        raw.name === record.name &&
        raw.user_id === record.userId
    );
};

export const isRecordTeamMembershipEqualToRaw = (record: TeamMembership, raw: RawTeamMembership) => {
    return raw.team_id === record.teamId && raw.user_id === record.userId;
};

export const isRecordCustomEmojiEqualToRaw = (record: CustomEmoji, raw: RawCustomEmoji) => {
    return raw.name === record.name;
};

export const isRecordGroupMembershipEqualToRaw = (record: GroupMembership, raw: RawGroupMembership) => {
    return raw.user_id === record.userId && raw.group_id === record.groupId;
};

export const isRecordChannelMembershipEqualToRaw = (record: ChannelMembership, raw: RawChannelMembership) => {
    return raw.user_id === record.userId && raw.channel_id === record.channelId;
};

export const isRecordGroupEqualToRaw = (record: Group, raw: RawGroup) => {
    return raw.name === record.name && raw.display_name === record.displayName;
};

export const isRecordGroupsInTeamEqualToRaw = (record: GroupsInTeam, raw: RawGroupsInTeam) => {
    return raw.team_id === record.teamId && raw.group_id === record.groupId;
};

export const isRecordGroupsInChannelEqualToRaw = (record: GroupsInChannel, raw: RawGroupsInChannel) => {
    return raw.channel_id === record.channelId && raw.group_id === record.groupId;
};

export const isRecordTeamEqualToRaw = (record: Team, raw: RawTeam) => {
    return raw.id === record.id;
};

export const isRecordTeamChannelHistoryEqualToRaw = (record: TeamChannelHistory, raw: RawTeamChannelHistory) => {
    return raw.team_id === record.teamId;
};

export const isRecordTeamSearchHistoryEqualToRaw = (record: TeamSearchHistory, raw: RawTeamSearchHistory) => {
    return raw.team_id === record.teamId && raw.term === record.term;
};

export const isRecordSlashCommandEqualToRaw = (record: SlashCommand, raw: RawSlashCommand) => {
    return raw.id === record.id;
};

export const isRecordMyTeamEqualToRaw = (record: MyTeam, raw: RawMyTeam) => {
    return raw.team_id === record.teamId;
};

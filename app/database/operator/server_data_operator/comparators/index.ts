// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Channel from '@typings/database/models/servers/channel';
import ChannelInfo from '@typings/database/models/servers/channel_info';
import ChannelMembership from '@typings/database/models/servers/channel_membership';
import CustomEmoji from '@typings/database/models/servers/custom_emoji';
import {
    RawChannel,
    RawChannelInfo,
    RawChannelMembership,
    RawCustomEmoji,
    RawDraft,
    RawGroup,
    RawGroupMembership,
    RawGroupsInChannel,
    RawGroupsInTeam,
    RawMyChannel,
    RawMyChannelSettings,
    RawMyTeam,
    RawPost,
    RawPreference,
    RawRole,
    RawSlashCommand,
    RawSystem,
    RawTeam,
    RawTeamChannelHistory,
    RawTeamMembership,
    RawTeamSearchHistory,
    RawTermsOfService,
    RawUser,
} from '@typings/database/database';
import Draft from '@typings/database/models/servers/draft';
import Group from '@typings/database/models/servers/group';
import GroupMembership from '@typings/database/models/servers/group_membership';
import GroupsInChannel from '@typings/database/models/servers/groups_in_channel';
import GroupsInTeam from '@typings/database/models/servers/groups_in_team';
import MyChannel from '@typings/database/models/servers/my_channel';
import MyChannelSettings from '@typings/database/models/servers/my_channel_settings';
import MyTeam from '@typings/database/models/servers/my_team';
import Post from '@typings/database/models/servers/post';
import Preference from '@typings/database/models/servers/preference';
import Role from '@typings/database/models/servers/role';
import SlashCommand from '@typings/database/models/servers/slash_command';
import System from '@typings/database/models/servers/system';
import Team from '@typings/database/models/servers/team';
import TeamChannelHistory from '@typings/database/models/servers/team_channel_history';
import TeamMembership from '@typings/database/models/servers/team_membership';
import TeamSearchHistory from '@typings/database/models/servers/team_search_history';
import TermsOfService from '@typings/database/models/servers/terms_of_service';
import User from '@typings/database/models/servers/user';

/**
 *  This file contains all the comparators that are used by the handlers to find out which records to truly update and
 *  which one to create.  A 'record' is a model in our database and a 'raw' is the object that is passed to the handler
 *  (e.g. API response). Each comparator will return a boolean condition after comparing specific fields from the
 *  'record' and the 'raw'
 */

export const isRecordRoleEqualToRaw = (record: Role, raw: RawRole) => {
    return raw.id === record.id;
};

export const isRecordSystemEqualToRaw = (record: System, raw: RawSystem) => {
    return raw.id === record.id;
};

export const isRecordTermsOfServiceEqualToRaw = (record: TermsOfService, raw: RawTermsOfService) => {
    return raw.id === record.id;
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
    return raw.id === record.id;
};

export const isRecordGroupMembershipEqualToRaw = (record: GroupMembership, raw: RawGroupMembership) => {
    return raw.user_id === record.userId && raw.group_id === record.groupId;
};

export const isRecordChannelMembershipEqualToRaw = (record: ChannelMembership, raw: RawChannelMembership) => {
    return raw.user_id === record.userId && raw.channel_id === record.channelId;
};

export const isRecordGroupEqualToRaw = (record: Group, raw: RawGroup) => {
    return raw.id === record.id;
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

export const isRecordChannelEqualToRaw = (record: Channel, raw: RawChannel) => {
    return raw.id === record.id;
};

export const isRecordMyChannelSettingsEqualToRaw = (record: MyChannelSettings, raw: RawMyChannelSettings) => {
    return raw.channel_id === record.channelId;
};

export const isRecordChannelInfoEqualToRaw = (record: ChannelInfo, raw: RawChannelInfo) => {
    return raw.channel_id === record.channelId;
};

export const isRecordMyChannelEqualToRaw = (record: MyChannel, raw: RawMyChannel) => {
    return raw.channel_id === record.channelId;
};

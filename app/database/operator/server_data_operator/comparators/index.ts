// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type CategoryModel from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type DraftModel from '@typings/database/models/servers/draft';
import type FileModel from '@typings/database/models/servers/file';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type PostModel from '@typings/database/models/servers/post';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type RoleModel from '@typings/database/models/servers/role';
import type SlashCommandModel from '@typings/database/models/servers/slash_command';
import type SystemModel from '@typings/database/models/servers/system';
import type TeamModel from '@typings/database/models/servers/team';
import type TeamChannelHistoryModel from '@typings/database/models/servers/team_channel_history';
import type TeamMembershipModel from '@typings/database/models/servers/team_membership';
import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';
import type TermsOfServiceModel from '@typings/database/models/servers/terms_of_service';
import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';

/**
 *  This file contains all the comparators that are used by the handlers to find out which records to truly update and
 *  which one to create.  A 'record' is a model in our database and a 'raw' is the object that is passed to the handler
 *  (e.g. API response). Each comparator will return a boolean condition after comparing specific fields from the
 *  'record' and the 'raw'
 */

export const isRecordCategoryEqualToRaw = (record: CategoryModel, raw: Category) => {
    return raw.id === record.id;
};

export const isRecordCategoryChannelEqualToRaw = (record: CategoryChannelModel, raw: CategoryChannel) => {
    return (record.id === raw.id);
};

export const isRecordRoleEqualToRaw = (record: RoleModel, raw: Role) => {
    return raw.id === record.id;
};

export const isRecordSystemEqualToRaw = (record: SystemModel, raw: IdValue) => {
    return raw.id === record.id;
};

export const isRecordTermsOfServiceEqualToRaw = (record: TermsOfServiceModel, raw: TermsOfService) => {
    return raw.id === record.id;
};

export const isRecordDraftEqualToRaw = (record: DraftModel, raw: Draft) => {
    return raw.channel_id === record.channelId && raw.root_id === record.rootId;
};

export const isRecordPostEqualToRaw = (record: PostModel, raw: Post) => {
    return raw.id === record.id;
};

export const isRecordUserEqualToRaw = (record: UserModel, raw: UserProfile) => {
    return raw.id === record.id;
};

export const isRecordPreferenceEqualToRaw = (record: PreferenceModel, raw: PreferenceType) => {
    return (
        raw.category === record.category &&
        raw.name === record.name &&
        raw.user_id === record.userId
    );
};

export const isRecordTeamMembershipEqualToRaw = (record: TeamMembershipModel, raw: TeamMembership) => {
    return raw.team_id === record.teamId && raw.user_id === record.userId;
};

export const isRecordCustomEmojiEqualToRaw = (record: CustomEmojiModel, raw: CustomEmoji) => {
    return raw.id === record.id;
};

export const isRecordChannelMembershipEqualToRaw = (record: ChannelMembershipModel, raw: Pick<ChannelMembership, 'user_id' | 'channel_id'>) => {
    return raw.user_id === record.userId && raw.channel_id === record.channelId;
};

export const isRecordTeamEqualToRaw = (record: TeamModel, raw: Team) => {
    return raw.id === record.id;
};

export const isRecordTeamChannelHistoryEqualToRaw = (record: TeamChannelHistoryModel, raw: TeamChannelHistory) => {
    return raw.id === record.id;
};

export const isRecordTeamSearchHistoryEqualToRaw = (record: TeamSearchHistoryModel, raw: TeamSearchHistory) => {
    return raw.team_id === record.teamId && raw.term === record.term;
};

export const isRecordSlashCommandEqualToRaw = (record: SlashCommandModel, raw: SlashCommand) => {
    return raw.id === record.id;
};

export const isRecordMyTeamEqualToRaw = (record: MyTeamModel, raw: MyTeam) => {
    return raw.id === record.id;
};

export const isRecordChannelEqualToRaw = (record: ChannelModel, raw: Channel) => {
    return raw.id === record.id;
};

export const isRecordMyChannelSettingsEqualToRaw = (record: MyChannelSettingsModel, raw: ChannelMembership) => {
    return raw.channel_id === record.id;
};

export const isRecordChannelInfoEqualToRaw = (record: ChannelInfoModel, raw: ChannelInfo) => {
    return raw.id === record.id;
};

export const isRecordMyChannelEqualToRaw = (record: MyChannelModel, raw: ChannelMembership) => {
    return raw.channel_id === record.id;
};

export const isRecordFileEqualToRaw = (record: FileModel, raw: FileInfo) => {
    return raw.id === record.id;
};

export const isRecordThreadEqualToRaw = (record: ThreadModel, raw: Thread) => {
    return raw.id === record.id;
};

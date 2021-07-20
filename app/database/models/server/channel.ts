// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Query, Relation} from '@nozbe/watermelondb';
import {children, field, immutableRelation, lazy} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type DraftModel from '@typings/database/models/servers/draft';
import type GroupsInChannelModel from '@typings/database/models/servers/groups_in_channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type TeamModel from '@typings/database/models/servers/team';
import type UserModel from '@typings/database/models/servers/user';

const {
    CHANNEL,
    CHANNEL_INFO,
    CHANNEL_MEMBERSHIP,
    DRAFT,
    GROUPS_IN_CHANNEL,
    MY_CHANNEL,
    MY_CHANNEL_SETTINGS,
    POSTS_IN_CHANNEL,
    POST,
    TEAM,
    USER,
} = MM_TABLES.SERVER;

/**
 * The Channel model represents a channel in the Mattermost app.
 */
export default class ChannelModel extends Model {
    /** table (name) : Channel */
    static table = CHANNEL;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A CHANNEL is associated with only one CHANNEL_INFO (relationship is 1:1) */
        [CHANNEL_INFO]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL can be associated with multiple CHANNEL_MEMBERSHIP (relationship is 1:N) */
        [CHANNEL_MEMBERSHIP]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL can be associated with multiple DRAFT (relationship is 1:N) */
        [DRAFT]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL can be associated with multiple GROUPS_IN_CHANNEL  (relationship is 1:N) */
        [GROUPS_IN_CHANNEL]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL is associated with only one MY_CHANNEL (relationship is 1:1) */
        [MY_CHANNEL]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL is associated to only one MY_CHANNEL_SETTINGS (relationship is 1:1) */
        [MY_CHANNEL_SETTINGS]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL can be associated with multiple POSTS_IN_CHANNEL (relationship is 1:N) */
        [POSTS_IN_CHANNEL]: {type: 'has_many', foreignKey: 'id'},

        /** A CHANNEL can contain multiple POST (relationship is 1:N) */
        [POST]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A TEAM can be associated to CHANNEL (relationship is 1:N) */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},

        /** A USER can create multiple CHANNEL (relationship is 1:N) */
        [USER]: {type: 'belongs_to', key: 'creator_id'},
    };

    /** create_at : The creation date for this channel */
    @field('create_at') createAt!: number;

    /** creator_id : The user who created this channel */
    @field('creator_id') creatorId!: string;

    /** update_at : The timestamp to when this channel was last updated on the server */
    @field('update_at') updateAt!: number;

    /** delete_at : The deletion/archived date of this channel */
    @field('delete_at') deleteAt!: number;

    /** display_name : The channel display name (e.g. Town Square ) */
    @field('display_name') displayName!: string;

    /** is_group_constrained : If a channel is  restricted to certain groups, this boolean will be true and only
     * members of that group have access to this team. Hence indicating that the members of this channel are
     * managed by groups.
     */
    @field('is_group_constrained') isGroupConstrained!: boolean;

    /** name : The name of the channel (e.g town-square) */
    @field('name') name!: string;

    /** team_id : The team to which this channel belongs.  It can be empty for direct/group message. */
    @field('team_id') teamId!: string;

    /** type : The type of the channel ( e.g. G: group messages, D: direct messages, P: private channel and O: public channel) */
    @field('type') type!: string;

    /** members : Users belonging to this channel */
    @children(CHANNEL_MEMBERSHIP) members!: ChannelMembershipModel[];

    /** drafts : All drafts for this channel */
    @children(DRAFT) drafts!: DraftModel[];

    /** groupsInChannel : Every group contained in this channel */
    @children(GROUPS_IN_CHANNEL) groupsInChannel!: GroupsInChannelModel[];

    /** posts : All posts made in that channel */
    @children(POST) posts!: PostModel[];

    /** postsInChannel : a section of the posts for that channel bounded by a range */
    @children(POSTS_IN_CHANNEL) postsInChannel!: PostsInChannelModel[];

    /** team : The TEAM to which this CHANNEL belongs */
    @immutableRelation(TEAM, 'team_id') team!: Relation<TeamModel>;

    /** creator : The USER who created this CHANNEL*/
    @immutableRelation(USER, 'creator_id') creator!: Relation<UserModel>;

    /** info : Query returning extra information about this channel from CHANNEL_INFO table */
    @lazy info = this.collections.get(CHANNEL_INFO).query(Q.on(CHANNEL, 'id', this.id)) as Query<ChannelInfoModel>;

    /** membership : Query returning the membership data for the current user if it belongs to this channel */
    @lazy membership = this.collections.get(MY_CHANNEL).query(Q.on(CHANNEL, 'id', this.id)) as Query<MyChannelModel>;

    /** settings: User specific settings/preferences for this channel */
    @lazy settings = this.collections.get(MY_CHANNEL_SETTINGS).query(Q.on(CHANNEL, 'id', this.id)) as Query<MyChannelSettingsModel>;
}

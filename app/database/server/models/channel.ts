// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Q} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {children, field, immutableRelation, lazy} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import ChannelMembership from '@typings/database/channel_membership';
import Draft from '@typings/database/draft';
import GroupsInChannel from '@typings/database/groups_in_channel';
import MyChannel from '@typings/database/my_channel';
import MyChannelSettings from '@typings/database/my_channel_settings';
import Post from '@typings/database/post';
import PostInChannel from '@typings/database/post_in_channel';
import Team from '@typings/database/team';
import User from '@typings/database/user';

const {CHANNEL, CHANNEL_INFO, CHANNEL_MEMBERSHIP, DRAFT, GROUPS_IN_CHANNEL, MY_CHANNEL, MY_CHANNEL_SETTINGS, POSTS_IN_CHANNEL, POST, TEAM, USER} = MM_TABLES.SERVER;

/**
 * The Channel model represents a channel in the Mattermost app.
 */
export default class Channel extends Model {
    /** table (entity name) : Channel */
    static table = CHANNEL

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A CHANNEL is associated with only one Channel_Info ( relationship is 1:1) */
        [CHANNEL_INFO]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL can be associated to multiple records from entity CHANNEL_MEMBERSHIP ( relationship is 1:N) */
        [CHANNEL_MEMBERSHIP]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL can be associated to multiple records from entity DRAFT ( relationship is 1:N) */
        [DRAFT]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL can be associated to multiple records from entity GROUPS_IN_CHANNEL  ( relationship is 1:N) */
        [GROUPS_IN_CHANNEL]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL can be associated to multiple records from entity MY_CHANNEL ( relationship is 1:N) */
        [MY_CHANNEL]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL can be associated to multiple records from entity MY_CHANNEL_SETTINGS ( relationship is 1:N) */
        [MY_CHANNEL_SETTINGS]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL can be associated to multiple records from entity POSTS_IN_CHANNEL ( relationship is 1:N) */
        [POSTS_IN_CHANNEL]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A CHANNEL can contain multiple POST ( relationship is 1:N) */
        [POST]: {type: 'has_many', foreignKey: 'channel_id'},

        /** A TEAM can be associated to multiple records from entity CHANNEL ( relationship is 1:N) */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},

        /** A USER can create multiple CHANNEL ( relationship is 1:N) */
        [USER]: {type: 'belongs_to', key: 'creator_id'},
    }

    /** create_at : The creation date for this channel */
    @field('create_at') createAt! : number

    /** creator_id : The user who created this channel */
    @field('creator_id') creatorId! : string

    /** delete_at : The deletion/archived date of this channel */
    @field('delete_at') deleteAt! : number

    /** display_name : The channel display name (e.g. Contributors ) */
    @field('display_name') displayName! : string

    /** is_group_constrained : If group is restricted to certain users/teams only */
    @field('is_group_constrained') isGroupConstrained! : boolean

    /** name : The name of the channel (e.g core) */
    @field('name') name! : string

    /** team_id : The team to which this channel belongs.  It can be null/empty for direct/group message. */
    @field('team_id') teamId! : string

    /** type : The type of message in this channel ( e.g. G: grouped message, D: direct message, P: private message and O: public message) */
    @field('type') type! : string

    /** settings: User specific settings/preferences for this channel */
    @children(MY_CHANNEL_SETTINGS) settings! : MyChannelSettings

    /** members : Users belonging to this channel */
    @children(CHANNEL_MEMBERSHIP) members! : ChannelMembership

    /** draft : All drafts for this channel */
    @children(DRAFT) draft! : Draft

    /** groupsInChannel : Every group contained in this channel */
    @children(GROUPS_IN_CHANNEL) groupsInChannel! : GroupsInChannel

    /** membership: all the channels that belongs to a user */
    @children(MY_CHANNEL) membership! : MyChannel

    /** posts : all posts made in that channel */
    @children(POST) posts! : Post

    /** postsInChannel : a section of the posts for that channel bounded by a range */
    @children(POSTS_IN_CHANNEL) postsInChannel! : PostInChannel

    /** team : The 'Relation' property to the record from entity TEAM */
    @immutableRelation(TEAM, 'team_id') team!: Team

    /** creator : The 'Relation' property to the record from entity USER */
    @immutableRelation(USER, 'creator_id') creator!: User

    /** info : The lazy query property to the record from entity CHANNEL_INFO */
    @lazy info = this.collections.get(CHANNEL_INFO).query(Q.on(CHANNEL, 'id', this.id))
}

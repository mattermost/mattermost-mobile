// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import children from '@nozbe/watermelondb/decorators/children';
import Draft from '@typings/database/draft';
import GroupsInChannel from '@typings/database/groups_in_channel';
import PostInChannel from '@typings/database/post_in_channel';
import MyChannelSettings from '@typings/database/my_channel_settings';
import MyChannel from '@typings/database/my_channel';
import ChannelInfo from '@typings/database/channel_info';
import immutableRelation from '@nozbe/watermelondb/decorators/immutableRelation';
import relation from '@nozbe/watermelondb/decorators/relation';
import User from '@typings/database/user';
import Team from '@typings/database/team';
import ChannelMembership from '@typings/database/channel_membership';
import Post from '@typings/database/post';

export default class Channel extends Model {
    static table = MM_TABLES.SERVER.CHANNEL
    static associations: Associations = {
        [MM_TABLES.SERVER.CHANNEL_INFO]: {type: 'has_many', foreignKey: 'channel_id'},
        [MM_TABLES.SERVER.CHANNEL_MEMBERSHIP]: {type: 'has_many', foreignKey: 'channel_id'},
        [MM_TABLES.SERVER.DRAFT]: {type: 'has_many', foreignKey: 'channel_id'},
        [MM_TABLES.SERVER.GROUPS_IN_CHANNEL]: {type: 'has_many', foreignKey: 'channel_id'},
        [MM_TABLES.SERVER.MY_CHANNEL]: {type: 'has_many', foreignKey: 'channel_id'},
        [MM_TABLES.SERVER.MY_CHANNEL_SETTINGS]: {type: 'has_many', foreignKey: 'channel_id'},
        [MM_TABLES.SERVER.POSTS_IN_CHANNEL]: {type: 'has_many', foreignKey: 'channel_id'},
        [MM_TABLES.SERVER.POST]: {type: 'has_many', foreignKey: 'channel_id'},
        [MM_TABLES.SERVER.TEAM]: {type: 'belongs_to', key: 'team_id'},
        [MM_TABLES.SERVER.USER]: {type: 'belongs_to', key: 'creator_id'},
    }

    @field('create_at') createAt! : number
    @field('creator_id') creatorId! : string
    @field('delete_at') deleteAt! : number
    @field('display_name') displayName! : string
    @field('is_group_constrained') isGroupConstrained! : boolean
    @field('name') name! : string
    @field('team_id') teamId! : string
    @field('type') type! : string

    @children(MM_TABLES.SERVER.CHANNEL_MEMBERSHIP) channelMembership! : ChannelMembership
    @children(MM_TABLES.SERVER.DRAFT) draft! : Draft
    @children(MM_TABLES.SERVER.GROUPS_IN_CHANNEL) groupsInChannel! : GroupsInChannel
    @children(MM_TABLES.SERVER.MY_CHANNEL) myChannel! : MyChannel
    @children(MM_TABLES.SERVER.MY_CHANNEL_SETTINGS) myChannelSettings! : MyChannelSettings
    @children(MM_TABLES.SERVER.POST) post! : Post
    @children(MM_TABLES.SERVER.POSTS_IN_CHANNEL) postInChannel! : PostInChannel

    @relation(MM_TABLES.SERVER.CHANNEL_INFO, 'channel_id') channelInfo!: ChannelInfo
    @immutableRelation(MM_TABLES.SERVER.TEAM, 'team_id') channelTeam!: Team
    @immutableRelation(MM_TABLES.SERVER.USER, 'creator_id') channelUser!: User
}

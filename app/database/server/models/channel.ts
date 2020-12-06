// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import children from '@nozbe/watermelondb/decorators/children';
import field from '@nozbe/watermelondb/decorators/field';
import immutableRelation from '@nozbe/watermelondb/decorators/immutableRelation';
import relation from '@nozbe/watermelondb/decorators/relation';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import ChannelInfo from '@typings/database/channel_info';
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

export default class Channel extends Model {
    static table = CHANNEL
    static associations: Associations = {
        [CHANNEL_INFO]: {type: 'has_many', foreignKey: 'channel_id'},
        [CHANNEL_MEMBERSHIP]: {type: 'has_many', foreignKey: 'channel_id'},
        [DRAFT]: {type: 'has_many', foreignKey: 'channel_id'},
        [GROUPS_IN_CHANNEL]: {type: 'has_many', foreignKey: 'channel_id'},
        [MY_CHANNEL]: {type: 'has_many', foreignKey: 'channel_id'},
        [MY_CHANNEL_SETTINGS]: {type: 'has_many', foreignKey: 'channel_id'},
        [POSTS_IN_CHANNEL]: {type: 'has_many', foreignKey: 'channel_id'},
        [POST]: {type: 'has_many', foreignKey: 'channel_id'},
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
        [USER]: {type: 'belongs_to', key: 'creator_id'},
    }

    @field('create_at') createAt! : number
    @field('creator_id') creatorId! : string
    @field('delete_at') deleteAt! : number
    @field('display_name') displayName! : string
    @field('is_group_constrained') isGroupConstrained! : boolean
    @field('name') name! : string
    @field('team_id') teamId! : string
    @field('type') type! : string

    @children(CHANNEL_MEMBERSHIP) members! : ChannelMembership
    @children(DRAFT) draft! : Draft
    @children(GROUPS_IN_CHANNEL) groupsInChannel! : GroupsInChannel
    @children(MY_CHANNEL) membership! : MyChannel
    @children(MY_CHANNEL_SETTINGS) settings! : MyChannelSettings
    @children(POST) posts! : Post
    @children(POSTS_IN_CHANNEL) postsInChannel! : PostInChannel

    @relation(CHANNEL_INFO, 'channel_id') info!: ChannelInfo
    @immutableRelation(TEAM, 'team_id') team!: Team
    @immutableRelation(USER, 'creator_id') creator!: User
}

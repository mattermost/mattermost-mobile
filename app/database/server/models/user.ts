// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {children, field, json} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import Channel from '@typings/database/channel';
import ChannelMembership from '@typings/database/channel_membership';
import GroupMembership from '@typings/database/group_membership';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import Post from '@typings/database/post';
import Preference from '@typings/database/preference';
import Reaction from '@typings/database/reaction';
import TeamMembership from '@typings/database/team_membership';

const {CHANNEL, CHANNEL_MEMBERSHIP, GROUP_MEMBERSHIP, POST, PREFERENCE, REACTION, TEAM_MEMBERSHIP, USER} = MM_TABLES.SERVER;

export default class User extends Model {
    static table = USER
    static associations: Associations = {
        [CHANNEL]: {type: 'has_many', foreignKey: 'creator_id'},
        [CHANNEL_MEMBERSHIP]: {type: 'has_many', foreignKey: 'user_id'},
        [GROUP_MEMBERSHIP]: {type: 'has_many', foreignKey: 'user_id'},
        [POST]: {type: 'has_many', foreignKey: 'user_id'},
        [PREFERENCE]: {type: 'has_many', foreignKey: 'user_id'},
        [REACTION]: {type: 'has_many', foreignKey: 'user_id'},
        [TEAM_MEMBERSHIP]: {type: 'has_many', foreignKey: 'user_id'},
    }

    @field('auth_service') authService! : string
    @field('delete_at') deleteAt! : number
    @field('email') email! : string
    @field('first_name') firstName! : string
    @field('is_bot') isBot! : boolean
    @field('is_guest') isGuest! : boolean
    @field('last_name') lastName! : string
    @field('last_picture_update') lastPictureUpdate! : number
    @field('locale') locale! : string
    @field('nick_name') nickName! : string
    @field('position') position! : string
    @field('roles') roles! : string
    @field('status') status! : string
    @field('user_name') userName! : string
    @json('notify_props', (rawJson) => rawJson) notifyProps! : string[]
    @json('props', (rawJson) => rawJson) props! : string[]
    @json('time_zone', (rawJson) => rawJson) timeZone! : string[]

    @children(CHANNEL) channel! : Channel
    @children(CHANNEL_MEMBERSHIP) channelMembership! : ChannelMembership
    @children(GROUP_MEMBERSHIP) groupMembership! : GroupMembership
    @children(POST) post! : Post
    @children(PREFERENCE) preference! : Preference
    @children(REACTION) reaction! : Reaction
    @children(TEAM_MEMBERSHIP) teamMembership! : TeamMembership
}

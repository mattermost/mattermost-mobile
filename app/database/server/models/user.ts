// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import children from '@nozbe/watermelondb/decorators/children';
import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';

import {MM_TABLES} from '@constants/database';
import Channel from '@typings/database/channel';
import ChannelMembership from '@typings/database/channel_membership';
import GroupMembership from '@typings/database/group_membership';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import Post from '@typings/database/post';
import Preference from '@typings/database/preference';
import Reaction from '@typings/database/reaction';
import TeamMembership from '@typings/database/team_membership';

export default class User extends Model {
    static table = MM_TABLES.SERVER.USER
    static associations: Associations = {
        [MM_TABLES.SERVER.CHANNEL]: {type: 'has_many', foreignKey: 'creator_id'},
        [MM_TABLES.SERVER.CHANNEL_MEMBERSHIP]: {type: 'has_many', foreignKey: 'user_id'},
        [MM_TABLES.SERVER.GROUP_MEMBERSHIP]: {type: 'has_many', foreignKey: 'user_id'},
        [MM_TABLES.SERVER.POST]: {type: 'has_many', foreignKey: 'user_id'},
        [MM_TABLES.SERVER.PREFERENCE]: {type: 'has_many', foreignKey: 'user_id'},
        [MM_TABLES.SERVER.REACTION]: {type: 'has_many', foreignKey: 'user_id'},
        [MM_TABLES.SERVER.TEAM_MEMBERSHIP]: {type: 'has_many', foreignKey: 'user_id'},
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

    @children(MM_TABLES.SERVER.CHANNEL) channel! : Channel
    @children(MM_TABLES.SERVER.CHANNEL_MEMBERSHIP) channelMembership! : ChannelMembership
    @children(MM_TABLES.SERVER.GROUP_MEMBERSHIP) groupMembership! : GroupMembership
    @children(MM_TABLES.SERVER.POST) post! : Post
    @children(MM_TABLES.SERVER.PREFERENCE) preference! : Preference
    @children(MM_TABLES.SERVER.REACTION) reaction! : Reaction
    @children(MM_TABLES.SERVER.TEAM_MEMBERSHIP) teamMembership! : TeamMembership
}

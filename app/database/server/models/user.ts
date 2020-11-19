// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import children from '@nozbe/watermelondb/decorators/children';
import TeamMembership from '@typings/database/team_membership';
import GroupMembership from '@typings/database/group_membership';
import Preference from '@typings/database/preference';
import Reaction from '@typings/database/reaction';
import ChannelMembership from '@typings/database/channel_membership';
import Post from '@typings/database/post';

export default class User extends Model {
    static table = MM_TABLES.SERVER.USER
    static associations: Associations = {
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
    @field('notify_props') notifyProps! : string
    @field('position') position! : string
    @field('props') props! : string
    @field('roles') roles! : string
    @field('status') status! : string
    @field('time_zone') timeZone! : string
    @field('user_id') userId! : string
    @field('user_name') userName! : string

    @children(MM_TABLES.SERVER.CHANNEL_MEMBERSHIP) channelMembership! : ChannelMembership
    @children(MM_TABLES.SERVER.GROUP_MEMBERSHIP) groupMembership! : GroupMembership
    @children(MM_TABLES.SERVER.POST) post! : Post
    @children(MM_TABLES.SERVER.PREFERENCE) preference! : Preference
    @children(MM_TABLES.SERVER.REACTION) reaction! : Reaction
    @children(MM_TABLES.SERVER.TEAM_MEMBERSHIP) teamMembership! : TeamMembership
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {children, field, json} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type PostModel from '@typings/database/models/servers/post';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type ReactionModel from '@typings/database/models/servers/reaction';
import type TeamMembershipModel from '@typings/database/models/servers/team_membership';

const {
    CHANNEL,
    CHANNEL_MEMBERSHIP,
    GROUP_MEMBERSHIP,
    POST,
    PREFERENCE,
    REACTION,
    TEAM_MEMBERSHIP,
    USER,
} = MM_TABLES.SERVER;

/**
 * The User model represents the 'USER' table and its relationship to other
 * shareholders in the app.
 */
export default class UserModel extends Model {
    /** table (name) : User */
    static table = USER;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** USER has a 1:N relationship with CHANNEL.  A user can create multiple channels */
        [CHANNEL]: {type: 'has_many', foreignKey: 'creator_id'},

        /** USER has a 1:N relationship with CHANNEL_MEMBERSHIP.  A user can be part of multiple channels */
        [CHANNEL_MEMBERSHIP]: {type: 'has_many', foreignKey: 'user_id'},

        /** USER has a 1:N relationship with GROUP_MEMBERSHIP.  A user can be part of multiple groups */
        [GROUP_MEMBERSHIP]: {type: 'has_many', foreignKey: 'user_id'},

        /** USER has a 1:N relationship with POST.  A user can author multiple posts */
        [POST]: {type: 'has_many', foreignKey: 'user_id'},

        /** USER has a 1:N relationship with PREFERENCE.  A user can have multiple preferences */
        [PREFERENCE]: {type: 'has_many', foreignKey: 'user_id'},

        /** USER has a 1:N relationship with REACTION.  A user can react to multiple posts */
        [REACTION]: {type: 'has_many', foreignKey: 'user_id'},

        /** USER has a 1:N relationship with TEAM_MEMBERSHIP.  A user can join multiple teams */
        [TEAM_MEMBERSHIP]: {type: 'has_many', foreignKey: 'user_id'},
    };

    /** auth_service : The type of authentication service registered to that user */
    @field('auth_service') authService!: string;

    /** update_at : The timestamp at which this user account has been updated */
    @field('update_at') updateAt!: number;

    /** delete_at : The timestamp at which this user account has been archived/deleted */
    @field('delete_at') deleteAt!: number;

    /** email : The email address for that user  */
    @field('email') email!: string;

    /** first_name : The user's first name */
    @field('first_name') firstName!: string;

    /** is_bot : Boolean flag indicating if the user is a bot */
    @field('is_bot') isBot!: boolean;

    /** is_guest : Boolean flag indicating if the user is a guest */
    @field('is_guest') isGuest!: boolean;

    /** last_name : The user's last name */
    @field('last_name') lastName!: string;

    /** last_picture_update : The timestamp of the last time the profile picture has been updated */
    @field('last_picture_update') lastPictureUpdate!: number;

    /** locale : The user's locale */
    @field('locale') locale!: string;

    /** nickname : The user's nickname */
    @field('nickname') nickname!: string;

    /** position : The user's position in the company */
    @field('position') position!: string;

    /** roles : The associated roles that this user has. Multiple roles concatenated together with comma to form a single string. */
    @field('roles') roles!: string;

    /** status : The presence status for the user */
    @field('status') status!: string;

    /** username : The user's username */
    @field('username') username!: string;

    /** notify_props : Notification preferences/configurations */
    @json('notify_props', safeParseJSON) notifyProps!: UserNotifyProps | null;

    /** props : Custom objects ( e.g. custom status) can be stored in there. Its type definition is known as
     *  'excess property check' in Typescript land.  We keep using it till we build up the final shape of this object.
     */
    @json('props', safeParseJSON) props!: UserProps | null;

    /** timezone : The timezone for this user */
    @json('timezone', safeParseJSON) timezone!: UserTimezone | null;

    /** channelsCreated : All the channels that this user created */
    @children(CHANNEL) channelsCreated!: ChannelModel[];

    /** channels : All the channels that this user is part of  */
    @children(CHANNEL_MEMBERSHIP) channels!: ChannelMembershipModel[];

    /** groups : All the groups that this user is part of  */
    @children(GROUP_MEMBERSHIP) groups!: GroupMembershipModel[];

    /** posts :  All the posts that this user has written*/
    @children(POST) posts!: PostModel[];

    /** preferences : All user preferences */
    @children(PREFERENCE) preferences!: PreferenceModel[];

    /** reactions : All the reactions to posts that this user had */
    @children(REACTION) reactions!: ReactionModel[];

    /** teams : All the team that this user is part of  */
    @children(TEAM_MEMBERSHIP) teams!: TeamMembershipModel[];

    prepareStatus = (status: string) => {
        this.prepareUpdate((u) => {
            u.status = status;
        });
    };
}

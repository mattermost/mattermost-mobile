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
 * The User model represents the 'USER' entity and its relationship to other
 * shareholders in the app.
 */
export default class User extends Model {
    /** table (entity name) : User */
    static table = USER;

    /** associations : Describes every relationship to this entity. */
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
    @field('auth_service') authService: string | undefined;

    /** delete_at : The timestamp at which this user account has been archived/deleted */
    @field('delete_at') deleteAt: number | undefined;

    /** email : The email address for that user  */
    @field('email') email: string | undefined;

    /** first_name : The user's first name */
    @field('first_name') firstName: string | undefined;

    /** is_bot : Boolean flag indicating if the user is a bot */
    @field('is_bot') isBot: boolean | undefined;

    /** is_guest : Boolean flag indicating if the user is a guest */
    @field('is_guest') isGuest: boolean | undefined;

    /** last_name : The user's last name */
    @field('last_name') lastName: string | undefined;

    /** last_picture_update : The timestamp of the last time the profile picture has been updated */
    @field('last_picture_update') lastPictureUpdate: number | undefined;

    /** locale : The user's locale */
    @field('locale') locale: string | undefined;

    /** nick_name : The user's nick name */
    @field('nick_name') nickName: string | undefined;

    /** position : The user's position in the company */
    @field('position') position: string | undefined;

    /** roles : The associated permissions that this user benefits from */
    @field('roles') roles: string | undefined;

    /** status : The presence status for the user */
    @field('status') status: string | undefined;

    /** user_name : The user's username */
    @field('user_name') userName: string | undefined;

    /** notify_props : Notification preferences/configurations */
    @json('notify_props', (rawJson) => rawJson) notifyProps: string[] | undefined;

    /** props : Custom objects ( e.g. custom status) can be stored in there */
    @json('props', (rawJson) => rawJson) props: string[] | undefined;

    /** time_zone : The different timezones listed for this user */
    @json('time_zone', (rawJson) => rawJson) timeZone: string[] | undefined;

    /** channelsCreated : All the channels that this user created */
    @children(CHANNEL) channelsCreated: Channel | undefined;

    /** channels : All the channels that this user is part of  */
    @children(CHANNEL_MEMBERSHIP) channels: ChannelMembership | undefined;

    /** groups : All the gorups that this user is part of  */
    @children(GROUP_MEMBERSHIP) groups: GroupMembership | undefined;

    /** posts :  All the posts that this user has written*/
    @children(POST) posts: Post | undefined;

    /** preferences : All user preferences */
    @children(PREFERENCE) preferences: Preference | undefined;

    /** reactions : All the reactions to posts that this user had */
    @children(REACTION) reactions: Reaction | undefined;

    /** teams : All the team that this user is part of  */
    @children(TEAM_MEMBERSHIP) teams: TeamMembership | undefined;
}

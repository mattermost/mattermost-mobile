// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {children, field, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type {Query} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type PostModel from '@typings/database/models/servers/post';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type ReactionModel from '@typings/database/models/servers/reaction';
import type TeamMembershipModel from '@typings/database/models/servers/team_membership';
import type ThreadParticipantsModel from '@typings/database/models/servers/thread_participant';
import type UserModelInterface from '@typings/database/models/servers/user';
import type {UserMentionKey, HighlightWithoutNotificationKey} from '@typings/global/markdown';

const {
    CHANNEL,
    CHANNEL_MEMBERSHIP,
    POST,
    PREFERENCE,
    REACTION,
    TEAM_MEMBERSHIP,
    THREAD_PARTICIPANT,
    USER,
} = MM_TABLES.SERVER;

/**
 * The User model represents the 'USER' table and its relationship to other
 * shareholders in the app.
 */
export default class UserModel extends Model implements UserModelInterface {
    /** table (name) : User */
    static table = USER;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** USER has a 1:N relationship with CHANNEL.  A user can create multiple channels */
        [CHANNEL]: {type: 'has_many', foreignKey: 'creator_id'},

        /** USER has a 1:N relationship with CHANNEL_MEMBERSHIP.  A user can be part of multiple channels */
        [CHANNEL_MEMBERSHIP]: {type: 'has_many', foreignKey: 'user_id'},

        /** USER has a 1:N relationship with POST.  A user can author multiple posts */
        [POST]: {type: 'has_many', foreignKey: 'user_id'},

        /** USER has a 1:N relationship with PREFERENCE.  A user can have multiple preferences */
        [PREFERENCE]: {type: 'has_many', foreignKey: 'user_id'},

        /** USER has a 1:N relationship with REACTION.  A user can react to multiple posts */
        [REACTION]: {type: 'has_many', foreignKey: 'user_id'},

        /** USER has a 1:N relationship with TEAM_MEMBERSHIP.  A user can join multiple teams */
        [TEAM_MEMBERSHIP]: {type: 'has_many', foreignKey: 'user_id'},

        /** USER has a 1:N relationship with THREAD_PARTICIPANT. A user can participate in multiple threads */
        [THREAD_PARTICIPANT]: {type: 'has_many', foreignKey: 'user_id'},
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

    /** remote_id : The ID of the remote organization that this user belongs to */
    @field('remote_id') remoteId!: string | null;

    /** notify_props : Notification preferences/configurations */
    @json('notify_props', safeParseJSON) notifyProps!: UserNotifyProps | null;

    /** props : Custom objects ( e.g. custom status) can be stored in there. Its type definition is known as
     *  'excess property check' in Typescript land.  We keep using it till we build up the final shape of this object.
     */
    @json('props', safeParseJSON) props!: UserProps | null;

    /** timezone : The timezone for this user */
    @json('timezone', safeParseJSON) timezone!: UserTimezone | null;

    /** termsOfServiceId : The id of the last accepted terms of service */
    @field('terms_of_service_id') termsOfServiceId!: string;

    /** termsOfServiceCreateAt : The last time the user accepted the terms of service */
    @field('terms_of_service_create_at') termsOfServiceCreateAt!: number;

    /** channelsCreated : All the channels that this user created */
    @children(CHANNEL) channelsCreated!: Query<ChannelModel>;

    /** channels : All the channels that this user is part of  */
    @children(CHANNEL_MEMBERSHIP) channels!: Query<ChannelMembershipModel>;

    /** posts :  All the posts that this user has written*/
    @children(POST) posts!: Query<PostModel>;

    /** preferences : All user preferences */
    @children(PREFERENCE) preferences!: Query<PreferenceModel>;

    /** reactions : All the reactions to posts that this user had */
    @children(REACTION) reactions!: Query<ReactionModel>;

    /** teams : All the team that this user is part of  */
    @children(TEAM_MEMBERSHIP) teams!: Query<TeamMembershipModel>;

    /** threadParticipations : All the thread participations this user is part of  */
    @children(THREAD_PARTICIPANT) threadParticipations!: Query<ThreadParticipantsModel>;

    prepareStatus = (status: string) => {
        this.prepareUpdate((u) => {
            u.status = status;
        });
    };

    get mentionKeys() {
        let keys: UserMentionKey[] = [];

        if (!this.notifyProps) {
            return keys;
        }

        if (this.notifyProps.mention_keys) {
            keys = keys.concat(this.notifyProps.mention_keys.split(',').map((key) => {
                return {key};
            }));
        }

        if (this.notifyProps.first_name === 'true' && this.firstName) {
            keys.push({key: this.firstName, caseSensitive: true});
        }

        if (this.notifyProps.channel === 'true') {
            keys.push({key: '@channel'});
            keys.push({key: '@all'});
            keys.push({key: '@here'});
        }

        const usernameKey = '@' + this.username;
        if (keys.findIndex((key) => key.key === usernameKey) === -1) {
            keys.push({key: usernameKey});
        }

        return keys;
    }

    get userMentionKeys() {
        const mentionKeys = this.mentionKeys;

        return mentionKeys.filter((m) => (
            m.key !== '@all' &&
            m.key !== '@channel' &&
            m.key !== '@here'
        ));
    }

    get highlightKeys() {
        if (!this.notifyProps) {
            return [];
        }

        const highlightWithoutNotificationKeys: HighlightWithoutNotificationKey[] = [];

        if (this.notifyProps?.highlight_keys?.length) {
            this.notifyProps.highlight_keys.
                split(',').
                forEach((key) => {
                    if (key.trim().length > 0) {
                        highlightWithoutNotificationKeys.push({key: key.trim()});
                    }
                });
        }

        return highlightWithoutNotificationKeys;
    }
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';

import Channel from '@typings/database/channel';
import ChannelMembership from '@typings/database/channel_membership';
import GroupMembership from '@typings/database/group_membership';
import Post from '@typings/database/post';
import Preference from '@typings/database/preference';
import Reaction from '@typings/database/reaction';
import TeamMembership from '@typings/database/team_membership';

/**
 * The User model represents the 'USER' entity and its relationship to other
 * shareholders in the app.
 */
export default class User extends Model {
    /** table (entity name) : User */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** auth_service : The type of authentication service registered to that user */
    authService: string;

    /** update_at : The timestamp at which this user account has been updated */
    updateAt!: number;

    /** delete_at : The timestamp at which this user account has been archived/deleted */
    deleteAt: number;

    /** email : The email address for that user  */
    email: string;

    /** first_name : The user's first name */
    firstName: string;

    /** is_bot : Boolean flag indicating if the user is a bot */
    isBot: boolean;

    /** is_guest : Boolean flag indicating if the user is a guest */
    isGuest: boolean;

    /** last_name : The user's last name */
    lastName: string;

    /** last_picture_update : The timestamp of the last time the profile picture has been updated */
    lastPictureUpdate: number;

    /** locale : The user's locale */
    locale: string;

    /** nickname : The user's nickname */
    nickname: string;

    /** position : The user's position in the company */
    position: string;

    /** roles : The associated roles that this user has */
    roles: string;

    /** status : The presence status for the user */
    status: string;

    /** username : The user's username */
    username: string;

    /** notify_props : Notification preferences/configurations */
    notifyProps: NotifyProps;

    /** props : Custom objects ( e.g. custom status) can be stored in there. Its type definition is known as
     *  'excess property check' in Typescript land.  We keep using it till we build up the final shape of this object.
     */
    props: UserProps;

    /** timezone : The timezone for this user */
    timezone: Timezone;

    /** channelsCreated : All the channels that this user created */
    channelsCreated: Channel[];

    /** channels : All the channels that this user is part of  */
    channels: ChannelMembership[];

    /** groups : All the groups that this user is part of  */
    groups: GroupMembership[];

    /** posts :  All the posts that this user has written*/
    posts: Post[];

    /** preferences : All user preferences */
    preferences: Preference[];

    /** reactions : All the reactions to posts that this user had */
    reactions: Reaction[];

    /** teams : All the team that this user is part of  */
    teams: TeamMembership[];
}

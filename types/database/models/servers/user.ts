// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ChannelModel from './channel';
import type ChannelMembershipModel from './channel_membership';
import type CustomProfileAttributeModel from './custom_profile_attribute';
import type PostModel from './post';
import type PreferenceModel from './preference';
import type ReactionModel from './reaction';
import type TeamMembershipModel from './team_membership';
import type ThreadParticipantsModel from './thread_participant';
import type {Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';
import type Query from '@nozbe/watermelondb/Query';
import type {HighlightWithoutNotificationKey, UserMentionKey} from '@typings/global/markdown';

/**
 * The User model represents the 'USER' table and its relationship to other
 * shareholders in the app.
 */
declare class UserModel extends Model {
    /** table (name) : User */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** auth_service : The type of authentication service registered to that user */
    authService: string;

    /** update_at : The timestamp at which this user account has been updated */
    updateAt: number;

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

    /** remote_id : The ID of the remote organization that this user belongs to */
    remoteId: string | null;

    /** notify_props : Notification preferences/configurations */
    notifyProps: UserNotifyProps | null;

    /** props : Custom objects ( e.g. custom status) can be stored in there. Its type definition is known as
     *  'excess property check' in Typescript land.  We keep using it till we build up the final shape of this object.
     */
    props: UserProps | null;

    /** timezone : The timezone for this user */
    timezone: UserTimezone | null;

    /** channelsCreated : All the channels that this user created */
    channelsCreated: Query<ChannelModel>;

    /** channels : All the channels that this user is part of  */
    channels: Query<ChannelMembershipModel>;

    /** posts :  All the posts that this user has written*/
    posts: Query<PostModel>;

    /** preferences : All user preferences */
    preferences: Query<PreferenceModel>;

    /** reactions : All the reactions to posts that this user had */
    reactions: Query<ReactionModel>;

    /** teams : All the team that this user is part of  */
    teams: Query<TeamMembershipModel>;

    /** threadParticipations : All the thread participations this user is part of  */
    threadParticipations: Query<ThreadParticipantsModel>;

    /**  prepareStatus: Prepare the model to update the user status in a batch operation */
    prepareStatus: (status: string) => void;

    /* user mentions keys may include @channel, @all, @here depending on notify_props */
    mentionKeys: UserMentionKey[];

    /* user mentions keys always excluding @channel, @all, @here */
    userMentionKeys: UserMentionKey[];

    /* user highlight keys are custom words that gets highlighted without notification */
    highlightKeys: HighlightWithoutNotificationKey[];

    /** termsOfServiceId : The id of the last accepted terms of service */
    termsOfServiceId: string;

    /** termsOfServiceCreateAt : The last time the user accepted the terms of service */
    termsOfServiceCreateAt: number;

    /** customProfileAttributes : All the custom profile attributes for this user */
    customProfileAttributes: Query<CustomProfileAttributeModel> | undefined;
}

export default UserModel;

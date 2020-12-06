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

export default class User extends Model {
    static table: string;
    static associations: Associations;
    authService: string;
    deleteAt: number;
    email: string;
    firstName: string;
    isBot: boolean;
    isGuest: boolean;
    lastName: string;
    lastPictureUpdate: number;
    locale: string;
    nickName: string;
    position: string;
    roles: string;
    status: string;
    userName: string;
    notifyProps: string[];
    props: string[];
    timeZone: string[];
    channel: Channel;
    channelMembership: ChannelMembership;
    groupMembership: GroupMembership;
    post: Post;
    preference: Preference;
    reaction: Reaction;
    teamMembership: TeamMembership;
}

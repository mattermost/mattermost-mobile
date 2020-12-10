// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ChannelInfo from '@typings/database/channel_info';
import ChannelMembership from '@typings/database/channel_membership';
import Draft from '@typings/database/draft';
import GroupsInChannel from '@typings/database/groups_in_channel';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import MyChannel from '@typings/database/my_channel';
import MyChannelSettings from '@typings/database/my_channel_settings';
import Post from '@typings/database/post';
import PostsInChannel from '@typings/database/posts_in_channel';
import Team from '@typings/database/team';
import User from '@typings/database/user';

export default class Channel extends Model {
    static table: string;
    static associations: Associations;
    createAt: number;
    creatorId: string;
    deleteAt: number;
    displayName: string;
    isGroupConstrained: boolean;
    name: string;
    teamId: string;
    type: string;
    channelMembership: ChannelMembership;
    draft: Draft;
    groupsInChannel: GroupsInChannel;
    myChannel: MyChannel;
    myChannelSettings: MyChannelSettings;
    post: Post;
    postInChannel: PostsInChannel;
    channelInfo: ChannelInfo;
    channelTeam: Team;
    channelUser: User;
}

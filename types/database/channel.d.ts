// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import Draft from '@typings/database/draft';
import Post from '@typings/database/post';
import ChannelMembership from '@typings/database/channel_membership';
import GroupsInChannel from '@typings/database/groups_in_channel';
import PostInChannel from '@typings/database/post_in_channel';
import MyChannelSettings from '@typings/database/my_channel_settings';
import MyChannel from '@typings/database/my_channel';
import ChannelInfo from '@typings/database/channel_info';
import User from '@typings/database/user';
import Team from '@typings/database/team';
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
    postInChannel: PostInChannel;
    channelInfo: ChannelInfo;
    channelTeam: Team;
    channelUser: User;
}

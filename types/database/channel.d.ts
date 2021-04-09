// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Query, Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import ChannelInfo from '@typings/database/channel_info';
import ChannelMembership from '@typings/database/channel_membership';
import Draft from '@typings/database/draft';
import GroupsInChannel from '@typings/database/groups_in_channel';
import MyChannel from '@typings/database/my_channel';
import MyChannelSettings from '@typings/database/my_channel_settings';
import Post from '@typings/database/post';
import PostsInChannel from '@typings/database/posts_in_channel';
import Team from '@typings/database/team';
import User from '@typings/database/user';

/**
 * The Channel model represents a channel in the Mattermost app.
 */
export default class Channel extends Model {
    /** table (entity name) : Channel */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** create_at : The creation date for this channel */
    createAt: number;

    /** creator_id : The user who created this channel */
    creatorId: string;

    /** delete_at : The deletion/archived date of this channel */
    deleteAt: number;

    /** update_at : The timestamp to when this channel was last updated on the server */
   updateAt!: number;

    /** display_name : The channel display name (e.g. Town Square ) */
    displayName: string;

    /** is_group_constrained : If a channel is  restricted to certain groups, this boolean will be true and only members of that group have access to this team. Hence indicating that the members of this channel are managed by groups. */
    isGroupConstrained: boolean;

    /** name : The name of the channel (e.g town-square) */
    name: string;

    /** team_id : The team to which this channel belongs.  It can be empty for direct/group message. */
    teamId: string;

    /** type : The type of the channel ( e.g. G: group messages, D: direct messages, P: private channel and O: public channel) */
    type: string;

    /** members : Users belonging to this channel */
    members: ChannelMembership[];

    /** drafts : All drafts for this channel */
    drafts: Draft[];

    /** groupsInChannel : Every group contained in this channel */
    groupsInChannel: GroupsInChannel[];

    /** posts : All posts made in the channel */
    posts: Post[];

    /** postsInChannel : a section of the posts for that channel bounded by a range */
    postsInChannel: PostsInChannel[];

    /** team : The TEAM to which this CHANNEL belongs */
    team: Relation<Team>;

    /** creator : The USER who created this CHANNEL*/
    creator: Relation<User>;

    /** info : Query returning extra information about this channel from entity CHANNEL_INFO */
    info: Query<ChannelInfo>;

    /** membership : Query returning the membership data for the current user if it belongs to this channel */
    membership: Query<MyChannel>;

    /** settings: User specific settings/preferences for this channel */
    settings: Query<MyChannelSettings>;
}

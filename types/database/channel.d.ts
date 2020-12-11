// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import ChannelMembership from '@typings/database/channel_membership';
import Draft from '@typings/database/draft';
import GroupsInChannel from '@typings/database/groups_in_channel';
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

    /** display_name : The channel display name (e.g. Contributors ) */
    displayName: string;

    /** is_group_constrained : If group is restricted to certain users/teams only */
    isGroupConstrained: boolean;

    /** name : The name of the channel (e.g core) */
    name: string;

    /** team_id : The team to which this channel belongs.  It can be null/empty for direct/group message. */
    teamId: string;

    /** type : The type of message in this channel ( e.g. G: grouped message, D: direct message, P: private message and O: public message) */
    type: string;

    /** settings: User specific settings/preferences for this channel */
    settings: MyChannelSettings;

    /** members : Users belonging to this channel */
    members: ChannelMembership;

    /** draft : All drafts for this channel */
    draft: Draft;

    /** groupsInChannel : Every group contained in this channel */
    groupsInChannel: GroupsInChannel;

    /** posts : all posts made in that channel */
    posts: Post;

    /** postsInChannel : a section of the posts for that channel bounded by a range */
    postsInChannel: PostsInChannel;

    /** team : The 'Relation' property to the record from entity TEAM */
    team: Team;

    /** creator : The 'Relation' property to the record from entity USER */
    creator: User;

    /** info : Query returning extra information about this channel from entity CHANNEL_INFO */
    info: import('@nozbe/watermelondb').Query<Model>;

    /** membership : Query returning all the channels that this user belongs to - from entity MY_CHANNEL */
    membership: import('@nozbe/watermelondb').Query<Model>;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type CategoryChannelModel from './category_channel';
import type ChannelBookmarkModel from './channel_bookmark';
import type ChannelInfoModel from './channel_info';
import type ChannelMembershipModel from './channel_membership';
import type DraftModel from './draft';
import type MyChannelModel from './my_channel';
import type PostModel from './post';
import type PostsInChannelModel from './posts_in_channel';
import type TeamModel from './team';
import type UserModel from './user';
import type {Query, Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

/**
 * The Channel model represents a channel in the Mattermost app.
 */
declare class ChannelModel extends Model {
    /** table (name) : Channel */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** create_at : The creation date for this channel */
    createAt: number;

    /** creator_id : The user who created this channel */
    creatorId: string;

    /** delete_at : The deletion/archived date of this channel */
    deleteAt: number;

    /** update_at : The timestamp to when this channel was last updated on the server */
    updateAt: number;

    /** display_name : The channel display name (e.g. Town Square ) */
    displayName: string;

    /** is_group_constrained : If a channel is  restricted to certain groups, this boolean will be true and only members of that group have access to this team. Hence indicating that the members of this channel are managed by groups. */
    isGroupConstrained: boolean;

    /** name : The name of the channel (e.g town-square) */
    name: string;

    /** shared: determines if it is a shared channel with another organization */
    shared: boolean;

    /** team_id : The team to which this channel belongs.  It can be empty for direct/group message. */
    teamId: string;

    /** type : The type of the channel ( e.g. G: group messages, D: direct messages, P: private channel and O: public channel) */
    type: ChannelType;

    bannerInfo?: ChannelBannerInfo;

    /** Whether the channel has Attribute-Based Access Control (ABAC) policy enforcement enabled, controlling access based on user attributes */
    abacPolicyEnforced?: boolean;

    /** members : Users belonging to this channel */
    members: Query<ChannelMembershipModel>;

    /** drafts : All drafts for this channel */
    drafts: Query<DraftModel>;

    /** bookmarks : All bookmaks for this channel */
    bookmarks: Query<ChannelBookmarkModel>;

    /** posts : All posts made in the channel */
    posts: Query<PostModel>;

    /** postsInChannel : a section of the posts for that channel bounded by a range */
    postsInChannel: Query<PostsInChannelModel>;

    /** playbookRuns : All playbook runs for this channel */
    playbookRuns: Query<PlaybookRunModel>;

    /** team : The TEAM to which this CHANNEL belongs */
    team: Relation<TeamModel>;

    /** creator : The USER who created this CHANNEL*/
    creator: Relation<UserModel>;

    /** info : Query returning extra information about this channel from the CHANNEL_INFO table */
    info: Relation<ChannelInfoModel>;

    /** membership : Query returning the membership data for the current user if it belongs to this channel */
    membership: Relation<MyChannelModel>;

    /** categoryChannel: category of this channel */
    categoryChannel: Relation<CategoryChannelModel>;

    toApi(): Channel;
}

export default ChannelModel;

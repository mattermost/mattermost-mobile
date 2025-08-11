// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ChannelModel from './channel';
import type MyChannelSettingsModel from './my_channel_settings';
import type {Relation, Model} from '@nozbe/watermelondb';

/**
 * MyChannel is an extension of the Channel model, but it lists only the Channels the app's user belongs to
 */
declare class MyChannelModel extends Model {
    /** table (name) : MyChannel */
    static table: string;

    /** last_post_at : The timestamp for any last post on this channel */
    lastPostAt: number;

    /** last_fetched_at : The timestamp when we successfully last fetched post on this channel */
    lastFetchedAt: number;

    /** last_viewed_at : The timestamp showing the user's last viewed post on this channel */
    lastViewedAt: number;

    /** manually_unread : Determine if the user marked a post as unread */
    manuallyUnread: boolean;

    /** mentions_count : The number of mentions on this channel */
    mentionsCount: number;

    /** message_count : The derived number of unread messages on this channel */
    messageCount: number;

    /** is_unread : Whether the channel has unread posts */
    isUnread: boolean;

    /** roles : The user's privileges on this channel */
    roles: string;

    /** viewed_at : The timestamp showing when the user's last opened this channel (this is used for the new line message indicator) */
    viewedAt: number;

    /** last_playbook_runs_fetch_at : The timestamp of the last successful fetch of playbook runs for this channel, used as the "since" parameter for incremental updates */
    lastPlaybookRunsFetchAt: number;

    /** channel : The relation pointing to the CHANNEL table */
    channel: Relation<ChannelModel>;

    /** settings: User specific settings/preferences for this channel */
    settings: Relation<MyChannelSettingsModel>;

    resetPreparedState: () => void;
}

export default MyChannelModel;

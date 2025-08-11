// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookChecklistModel from './playbook_checklist';
import type {Query, Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';
import type {SyncStatus} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type TeamModel from '@typings/database/models/servers/team';
import type UserModel from '@typings/database/models/servers/user';

/**
 * The PlaybookRun model represents a playbook run in the Mattermost app.
 */
declare class PlaybookRunModel extends Model {
    /** table (name) : PlaybookRun */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    // Foreign key to the playbook that generated this run
    playbookId: string;

    // ID of the post that created the run (nullable)
    postId: string | null;

    // Foreign key to the user commanding the run
    ownerUserId: string;

    // Foreign key to the team this run belongs to
    teamId: string;

    // Associated channel ID
    channelId: string;

    // Timestamp when the run was created
    createAt: number;

    // Timestamp when the run ended (0 if not finished)
    endAt: number;

    // Name of the playbook run
    name: string;

    // Description of the playbook run
    description: string;

    // Whether the run is still active
    isActive: boolean;

    // Zero-based index of the currently active stage
    activeStage: number;

    // Name of the current active stage
    activeStageTitle: string;

    // An array of user IDs that participate in the run
    participantIds: string[];

    // Summary of the playbook run
    summary: string;

    // The current status of the playbook run
    currentStatus: PlaybookRunStatusType;

    // Timestamp of the last status update
    lastStatusUpdateAt: number;

    // Indicates if retrospective is enabled for the run
    retrospectiveEnabled: boolean;

    // The retrospective details for the run
    retrospective: string;

    // Timestamp when the retrospective was published
    retrospectivePublishedAt: number;

    // The sync status of the playbook run
    sync: SyncStatus;

    // Timestamp of the last sync operation
    lastSyncAt: number;

    // Timestamp of the previous reminder
    previousReminder: number;

    // The sort order of the playbook run
    itemsOrder: string[];

    // The timestamp when the playbook run was updated
    updateAt: number;

    /** post : the post that created the run (nullable) */
    post: Relation<PostModel>;

    /** team : The TEAM to which the run channel belongs */
    team: Relation<TeamModel>;

    /** owner : The USER who commands this Playbook Run*/
    owner: Relation<UserModel>;

    /** channel : The channel to which this Playbook Run belongs */
    channel: Relation<ChannelModel>;

    /** checklists : The CHECKLISTS associated with this Playbook Run */
    checklists: Query<PlaybookChecklistModel>;

    /** participants : The USERS that participate in this Playbook Run */
    participants: () => Query<UserModel>;

    /** prepareDestroyWithRelations : Prepare the model for deletion with its relations */
    prepareDestroyWithRelations: () => Promise<Model[]>;
}

export default PlaybookRunModel;

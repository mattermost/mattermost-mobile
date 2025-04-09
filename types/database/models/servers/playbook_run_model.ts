// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';

/**
 * MyTeam represents only the teams that the current user belongs to
 */
declare class PlaybookRunModel extends Model {
    /** table (name) : MyTeam */
    static table: string;

    // Name of the playbook run
    name: string;

    // Description of the playbook run
    description: string;

    // Whether the run is still active
    is_active: boolean;

    // Foreign key to the user commanding the run
    owner_user_id: string;

    // Foreign key to the team this run belongs to
    team_id: string;

    // Associated channel ID
    channel_id: string;

    // Timestamp when the run was created
    create_at: number;

    // Timestamp when the run ended (0 if not finished)
    end_at: number;

    // Timestamp when deleted (0 if not deleted)
    delete_at: number;

    // Zero-based index of the currently active stage
    active_stage: number;

    // Name of the current active stage
    active_stage_title: string;

    // ID of the post that created the run (nullable)
    post_id: string | null;

    // Foreign key to the playbook that generated this run
    playbook_id: string;

    // An array of user IDs that participate in the run
    participant_ids: string[];

    // Summary of the playbook run
    summary: string;

    // The current status of the playbook run
    current_status: string;

    // Timestamp of the last status update
    last_status_update_at: number;

    // Timestamp of the last run update
    last_update_at: number;

    // Indicates if retrospective is enabled for the run
    retrospective_enabled: boolean;

    // The retrospective details for the run
    retrospective: string;

    // Timestamp when the retrospective was published
    retrospective_published_at: number;
}

export default PlaybookRunModel;

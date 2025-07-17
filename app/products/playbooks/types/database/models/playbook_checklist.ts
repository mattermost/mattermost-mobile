// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookRunModel from './playbook_run';
import type {Relation, Model, Query} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';
import type PlaybookChecklistItemModel from '@playbooks/database/models/playbook_checklist_item';
import type {SyncStatus} from '@typings/database/database';

/**
 * The PlaybookChecklist model represents a checklist in a playbook run in the Mattermost app.
 */
declare class PlaybookChecklistModel extends Model {
    /** table (name) : PlaybookChecklist */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    // Foreign key to the playbook run that generated this checklist
    runId: string;

    // title of the checklist
    title: string;

    // The sync status of the checklist
    sync: SyncStatus;

    // The timestamp when the checklist was last synced
    lastSyncAt: number;

    // The sort order of the checklist
    itemsOrder: string[];

    // The timestamp when the checklist was updated
    updateAt: number;

    /** run : The playbook run to which this checklist belongs */
    run: Relation<PlaybookRunModel>;

    /** items : All the items associated with this checklist */
    items: Query<PlaybookChecklistItemModel>;

    /** prepareDestroyWithRelations : Prepare the model for deletion with its relations */
    prepareDestroyWithRelations: () => Promise<Model[]>;
}

export default PlaybookChecklistModel;

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookRunModel from './playbook_run';
import type {Relation, Model, Query} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';
import type PlaybookChecklistItemModel from '@playbooks/database/models/playbook_checklist_item';

/**
 * The PlaybookChecklist model represents a playbook run in the Mattermost app.
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

    // Order of the checklist
    order: number;

    /** run : The playbook run to which this checklist belongs */
    run: Relation<PlaybookRunModel>;

    /** items : All the items associated with this checklist */
    items: Query<PlaybookChecklistItemModel>;
}

export default PlaybookChecklistModel;

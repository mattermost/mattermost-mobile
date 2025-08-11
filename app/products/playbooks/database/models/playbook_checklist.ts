// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {children, field, immutableRelation, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {safeParseJSONStringArray} from '@utils/helpers';

import type {Query, Relation} from '@nozbe/watermelondb';
import type PlaybookChecklistModelInterface from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {SyncStatus} from '@typings/database/database';

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

/**
 * The PlaybookChecklist model represents a checklist in a playbook run in the Mattermost app.
 */
export default class PlaybookChecklistModel extends Model implements PlaybookChecklistModelInterface {
    /** table (name) : PlaybookChecklist */
    static table = PLAYBOOK_CHECKLIST;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A PLAYBOOK_CHECKLIST belongs to a PLAYBOOK_RUN (relationship is N:1) */
        [PLAYBOOK_RUN]: {type: 'belongs_to', key: 'run_id'},

        [PLAYBOOK_CHECKLIST_ITEM]: {type: 'has_many', foreignKey: 'checklist_id'},
    };

    /** run_id: The id of the playbook run this checklist belongs to */
    @field('run_id') runId!: string;

    /** title : Title of the checklist */
    @field('title') title!: string;

    /** sync : The sync status of the checklist */
    @field('sync') sync!: SyncStatus;

    /** last_sync_at : The timestamp when the checklist was last synced */
    @field('last_sync_at') lastSyncAt!: number;

    /** items_order : The sort order of the checklist */
    @json('items_order', safeParseJSONStringArray) itemsOrder!: string[];

    /** update_at : The timestamp when the checklist was updated */
    @field('update_at') updateAt!: number;

    /** items : All the items associated with this checklist */
    @children(PLAYBOOK_CHECKLIST_ITEM) items!: Query<PlaybookChecklistItemModel>;

    /** run : The playbook run to which this checklist belongs */
    @immutableRelation(PLAYBOOK_RUN, 'run_id') run!: Relation<PlaybookRunModel>;

    prepareDestroyWithRelations = async (): Promise<Model[]> => {
        const preparedModels: Model[] = [this.prepareDestroyPermanently()];

        const items = await this.items?.fetch();
        if (items?.length) {
            for await (const item of items) {
                const preparedItem = item.prepareDestroyPermanently();
                preparedModels.push(preparedItem);
            }
        }

        return preparedModels;
    };
}

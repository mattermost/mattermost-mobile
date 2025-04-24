// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model, Q} from '@nozbe/watermelondb';

import {getUniqueRawsBy, prepareDestroyPermanentlyChildrenAssociatedRecords} from '@database/operator/utils/general';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {logWarning} from '@utils/log';

import {shouldHandlePlaybookChecklistItemRecord, shouldHandlePlaybookChecklistRecord, shouldUpdatePlaybookRunRecord} from '../comparators';
import {transformPlaybookChecklistItemRecord, transformPlaybookChecklistRecord, transformPlaybookRunRecord} from '../transformers';

import type ServerDataOperatorBase from '@database/operator/server_data_operator/handlers';
import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

type HandlePlaybookRunArgs = {
    prepareRecordsOnly: boolean;
    removeAssociatedRecords?: boolean;
    processChildren?: boolean;
    runs?: PlaybookRun[];
}

type HandlePlaybookChecklistArgs = {
    prepareRecordsOnly: boolean;
    removeAssociatedRecords?: boolean;
    processChildren?: boolean;
    checklists?: PlaybookChecklistWithRun[];
}

type HandlePlaybookChecklistItemArgs = {
    prepareRecordsOnly: boolean;
    items?: PlaybookChecklistItemWithChecklist[];
}

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

export interface PlaybookHandlerMix {
    handlePlaybookRun: (args: HandlePlaybookRunArgs) => Promise<Model[]>;
    handlePlaybookChecklist: (args: HandlePlaybookChecklistArgs) => Promise<Model[]>;
    handlePlaybookChecklistItem: (args: HandlePlaybookChecklistItemArgs) => Promise<PlaybookChecklistItemModel[]>;
}

const PlaybookHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    /**
     * Handles the playbook run records.
     * @param {HandlePlaybookRunArgs} args - The arguments for handling playbook run records.
     * @param {boolean} args.prepareRecordsOnly - If true, only prepares the records without saving them.
     * @param {boolean} [args.processChildren] - If true, process child records.
     * @param {boolean} [args.removeAssociatedRecords] - If true, remove associated records.
     * @param {PlaybookRun[]} [args.runs] - The playbook run records to handle.
     * @returns {Promise<any[]>} - A promise that resolves to an array of handled playbook run records.
     */
    handlePlaybookRun = async ({runs, prepareRecordsOnly, processChildren = false, removeAssociatedRecords = false}: HandlePlaybookRunArgs): Promise<Model[]> => {
        if (!runs?.length) {
            logWarning(
                'An empty or undefined "runs" array has been passed to the handlePlaybookRun method',
            );
            return [];
        }

        const batchRecords: Model[] = [];
        const uniqueRaws = getUniqueRawsBy({raws: runs, key: 'id'});
        const keys = uniqueRaws.map((raw) => raw.id);
        const existingRecords = await this.database.collections.get<PlaybookRunModel>(PLAYBOOK_RUN).query(
            Q.where('id', Q.oneOf(keys)),
        ).fetch();
        const existingRecordsMap = new Map(existingRecords.map((record) => [record.id, record]));
        const raws = uniqueRaws.reduce<{createOrUpdateRaws: PlaybookRun[]; deleteRaws: PlaybookRun[]}>((res, raw) => {
            const existingRecord = existingRecordsMap.get(raw.id);
            if (!existingRecord) {
                if (!raw.delete_at) {
                    res.createOrUpdateRaws.push(raw);
                }
                return res;
            }

            if (!raw.delete_at && shouldUpdatePlaybookRunRecord(existingRecord, raw)) {
                res.createOrUpdateRaws.push(raw);
            }

            if (raw.delete_at) {
                res.deleteRaws.push(raw);
            }

            return res;
        }, {createOrUpdateRaws: [], deleteRaws: []});

        if (!raws.createOrUpdateRaws.length && !raws.deleteRaws.length) {
            return [];
        }

        if (raws.createOrUpdateRaws.length || raws.deleteRaws.length) {
            const records = await this.handleRecords({
                fieldName: 'id',
                tableName: PLAYBOOK_RUN,
                prepareRecordsOnly: true,
                createOrUpdateRawValues: raws.createOrUpdateRaws,
                deleteRawValues: raws.deleteRaws,
                transformer: transformPlaybookRunRecord,
            }, 'handlePlaybookRun');
            batchRecords.push(...records);
        }

        if (raws.deleteRaws.length && removeAssociatedRecords) {
            const toRemoveIds = new Set(raws.deleteRaws.map((raw) => raw.id));
            const toRemove = existingRecords.filter((record) => toRemoveIds.has(record.id));
            const records = await prepareDestroyPermanentlyChildrenAssociatedRecords(toRemove);
            batchRecords.push(...records);
        }

        if (processChildren) {
            const checklists = uniqueRaws.reduce<PlaybookChecklistWithRun[]>((res, raw) => {
                if (raw.checklists?.length) {
                    let lists: PlaybookChecklistWithRun[] = raw.checklists.map((checklist, index) => ({
                        ...checklist,
                        order: index,
                        delete_at: raw.delete_at,
                        run_id: raw.id,
                    }));
                    if (removeAssociatedRecords) {
                        lists = lists.filter((item) => !item.delete_at); // Filter out items that are already marked for deletion
                    }
                    res.push(...lists);
                }
                return res;
            }, []);

            const childRecords = await this.handlePlaybookChecklist({checklists, prepareRecordsOnly: true, processChildren});
            batchRecords.push(...childRecords);
        }

        if (batchRecords.length && !prepareRecordsOnly) {
            await this.batchRecords(batchRecords, 'handlePlaybookRun');
        }

        return batchRecords;
    };

    /**
     * Handles the playbook checklist records.
     * @param {HandlePlaybookChecklistArgs} args - The arguments for handling playbook checklist records.
     * @param {boolean} args.prepareRecordsOnly - If true, only prepares the records without saving them.
     * @param {boolean} [args.processChildren] - If true, process child records.
     * @param {boolean} [args.removeAssociatedRecords] - If true, remove associated records.
     * @param {PlaybookChecklistWithRun[]} [args.checklists] - The playbook checklist records to handle.
     * @returns {Promise<Model[]>} - A promise that resolves to an array of handled playbook checklist records.
     */
    handlePlaybookChecklist = async ({checklists, prepareRecordsOnly, processChildren = false, removeAssociatedRecords = false}: HandlePlaybookChecklistArgs): Promise<Model[]> => {
        if (!checklists?.length) {
            logWarning(
                'An empty or undefined "checklists" array has been passed to the handlePlaybookChecklist method',
            );
            return [];
        }

        const batchRecords: Model[] = [];
        const uniqueRaws = getUniqueRawsBy({raws: checklists, key: 'id'});
        const keys = uniqueRaws.map((raw) => raw.id);
        const existingRecords = await this.database.collections.get<PlaybookChecklistModel>(PLAYBOOK_CHECKLIST).query(
            Q.where('id', Q.oneOf(keys)),
        ).fetch();
        const existingRecordsMap = new Map(existingRecords.map((record) => [record.id, record]));
        const raws = uniqueRaws.reduce<{createOrUpdateRaws: PlaybookChecklistWithRun[]; deleteRaws: PlaybookChecklistWithRun[]}>((res, raw) => {
            const existingRecord = existingRecordsMap.get(raw.id);
            if (!existingRecord) {
                if (!raw.delete_at) {
                    res.createOrUpdateRaws.push(raw);
                }
                return res;
            }

            if (!raw.delete_at && shouldHandlePlaybookChecklistRecord(existingRecord, raw)) {
                res.createOrUpdateRaws.push(raw);
            }

            if (raw.delete_at) {
                res.deleteRaws.push(raw);
            }

            return res;
        }, {createOrUpdateRaws: [], deleteRaws: []});

        if (!raws.createOrUpdateRaws.length && !raws.deleteRaws.length) {
            return [];
        }

        if (raws.createOrUpdateRaws.length || raws.deleteRaws.length) {
            const records = await this.handleRecords({
                fieldName: 'id',
                tableName: PLAYBOOK_CHECKLIST,
                prepareRecordsOnly: true,
                createOrUpdateRawValues: raws.createOrUpdateRaws,
                deleteRawValues: raws.deleteRaws,
                transformer: transformPlaybookChecklistRecord, // Replace with appropriate transformer for checklists
            }, 'handlePlaybookChecklist');
            batchRecords.push(...records);
        }

        if (raws.deleteRaws.length && removeAssociatedRecords) {
            const toRemoveIds = new Set(raws.deleteRaws.map((raw) => raw.id));
            const toRemove = existingRecords.filter((record) => toRemoveIds.has(record.id));
            const records = await prepareDestroyPermanentlyChildrenAssociatedRecords(toRemove);
            batchRecords.push(...records);
        }

        if (processChildren) {
            const items = uniqueRaws.reduce<PlaybookChecklistItemWithChecklist[]>((res, raw) => {
                if (raw.items?.length) {
                    let lists: PlaybookChecklistItemWithChecklist[] = raw.items.
                        map((item, index) => ({
                            ...item,
                            delete_at: raw.delete_at,
                            checklist_id: raw.id,
                            order: index,
                        }));

                    if (removeAssociatedRecords) {
                        lists = lists.filter((item) => !item.delete_at); // Filter out items that are already marked for deletion
                    }
                    res.push(...lists);
                }
                return res;
            }, []);
            const childRecords = await this.handlePlaybookChecklistItem({items, prepareRecordsOnly: true});
            batchRecords.push(...childRecords);
        }

        if (batchRecords.length && !prepareRecordsOnly) {
            await this.batchRecords(batchRecords, 'handlePlaybookChecklist');
        }

        return batchRecords;
    };

    /**
     * Handles the playbook checklist item records.
     * @param {HandlePlaybookChecklistArgs} args - The arguments for handling playbook checklist item records.
     * @param {boolean} args.prepareRecordsOnly - If true, only prepares the records without saving them.
     * @param {PlaybookChecklistItemWithChecklist[]} [args.items] - The playbook checklist item records to handle.
     * @returns {Promise<Model[]>} - A promise that resolves to an array of handled playbook checklist item records.
     */
    handlePlaybookChecklistItem = async ({items, prepareRecordsOnly}: HandlePlaybookChecklistItemArgs): Promise<PlaybookChecklistItemModel[]> => {
        if (!items?.length) {
            logWarning(
                'An empty or undefined "items" array has been passed to the handlePlaybookChecklistItem method',
            );
            return [];
        }

        const uniqueRaws = getUniqueRawsBy({raws: items, key: 'id'});
        const keys = uniqueRaws.map((raw) => raw.id);
        const existingRecords = await this.database.collections.get<PlaybookChecklistItemModel>(PLAYBOOK_CHECKLIST_ITEM).query(
            Q.where('id', Q.oneOf(keys)),
        ).fetch();
        const existingRecordsMap = new Map(existingRecords.map((record) => [record.id, record]));
        const raws = uniqueRaws.reduce<{createOrUpdateRaws: PlaybookChecklistItemWithChecklist[]; deleteRaws: PlaybookChecklistItemWithChecklist[]}>((res, raw) => {
            const existingRecord = existingRecordsMap.get(raw.id);
            if (!existingRecord) {
                if (!raw.delete_at) {
                    res.createOrUpdateRaws.push(raw);
                }
                return res;
            }

            if (!raw.delete_at && !shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)) {
                res.createOrUpdateRaws.push(raw);
            }

            if (raw.delete_at) {
                res.deleteRaws.push(raw);
            }

            return res;
        }, {createOrUpdateRaws: [], deleteRaws: []});

        if (!raws.createOrUpdateRaws.length && !raws.deleteRaws.length) {
            return [];
        }

        const records = await this.handleRecords({
            fieldName: 'id',
            tableName: PLAYBOOK_CHECKLIST_ITEM,
            prepareRecordsOnly: true,
            createOrUpdateRawValues: raws.createOrUpdateRaws,
            deleteRawValues: raws.deleteRaws,
            transformer: transformPlaybookChecklistItemRecord,
        }, 'handlePlaybookChecklistItem');

        if (records.length && !prepareRecordsOnly) {
            await this.batchRecords(records, 'handlePlaybookChecklistItem');
        }

        return records;
    };
};

export default PlaybookHandler;

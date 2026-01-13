// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model, Q} from '@nozbe/watermelondb';

import {getUniqueRawsBy, prepareDestroyPermanentlyChildrenAssociatedRecords} from '@database/operator/utils/general';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {logWarning} from '@utils/log';

import {shouldHandlePlaybookChecklistItemRecord, shouldHandlePlaybookChecklistRecord, shouldUpdatePlaybookRunRecord} from '../comparators';
import {transformPlaybookChecklistItemRecord, transformPlaybookChecklistRecord, transformPlaybookRunRecord, transformPlaybookRunPropertyFieldRecord, transformPlaybookRunPropertyValueRecord} from '../transformers';

import type ServerDataOperatorBase from '@database/operator/server_data_operator/handlers';
import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

type HandlePlaybookRunArgs = {
    prepareRecordsOnly: boolean;
    removeAssociatedRecords?: boolean;
    processChildren?: boolean;
    keepFinishedRuns?: boolean;
    runs?: PartialPlaybookRun[];
}

type HandlePlaybookChecklistArgs = {
    prepareRecordsOnly: boolean;
    processChildren?: boolean;
    checklists?: PartialChecklist[];
}

type HandlePlaybookChecklistItemArgs = {
    prepareRecordsOnly: boolean;
    items?: PartialChecklistItem[];
}

type HandlePlaybookRunPropertyFieldArgs = {
    prepareRecordsOnly: boolean;
    propertyFields?: PartialPlaybookRunPropertyField[];
}

type HandlePlaybookRunPropertyValueArgs = {
    prepareRecordsOnly: boolean;
    propertyValues?: PartialPlaybookRunPropertyValue[];
}

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM, PLAYBOOK_RUN_ATTRIBUTE, PLAYBOOK_RUN_ATTRIBUTE_VALUE} = PLAYBOOK_TABLES;

export interface PlaybookHandlerMix {
    handlePlaybookRun: (args: HandlePlaybookRunArgs) => Promise<Model[]>;
    handlePlaybookChecklist: (args: HandlePlaybookChecklistArgs) => Promise<Model[]>;
    handlePlaybookChecklistItem: (args: HandlePlaybookChecklistItemArgs) => Promise<PlaybookChecklistItemModel[]>;
    handlePlaybookRunPropertyField: (args: HandlePlaybookRunPropertyFieldArgs) => Promise<Model[]>;
    handlePlaybookRunPropertyValue: (args: HandlePlaybookRunPropertyValueArgs) => Promise<Model[]>;
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
    handlePlaybookRun = async ({runs, keepFinishedRuns, prepareRecordsOnly, processChildren, removeAssociatedRecords}: HandlePlaybookRunArgs): Promise<Model[]> => {
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

        // get the raws to create or update, will handle deletion later
        const createOrUpdateRaws = uniqueRaws.reduce<PartialPlaybookRun[]>((res, raw) => {
            const existingRecord = existingRecordsMap.get(raw.id);
            if (!existingRecord) {
                res.push(raw);
            } else if (shouldUpdatePlaybookRunRecord(existingRecord, raw)) {
                res.push(raw);
            }

            return res;
        }, []);

        if (createOrUpdateRaws.length) {
            const records = await this.handleRecords({
                fieldName: 'id',
                tableName: PLAYBOOK_RUN,
                prepareRecordsOnly: true,
                createOrUpdateRawValues: createOrUpdateRaws,
                transformer: transformPlaybookRunRecord,
            }, 'handlePlaybookRun prepare');
            batchRecords.push(...records);
        }

        const toRemove: Model[] = [];
        if (!keepFinishedRuns) {
            const finishedRaws = new Set(createOrUpdateRaws.filter((raw) => raw.end_at).map((raw) => (raw.id)));
            const numNewFinished = finishedRaws.size;

            const clauses: Q.Clause[] = [
                Q.where('end_at', Q.notEq(0)),
                Q.sortBy('create_at', 'desc'),
            ];

            if (numNewFinished < 5) {
                clauses.push(Q.skip(5 - numNewFinished));
                clauses.push(Q.take(9999)); // Required when using skip
            }

            const existingFinishedRecords = await this.database.collections.get<PlaybookRunModel>(PLAYBOOK_RUN).
                query(...clauses).
                fetch();

            for (const record of existingFinishedRecords) {
                if (!finishedRaws.has(record.id)) {
                    record.prepareDestroyPermanently();
                    batchRecords.push(record);
                    if (removeAssociatedRecords) {
                        toRemove.push(record);
                    }
                }
            }

            if (toRemove.length) {
                const childrenToRemove = await prepareDestroyPermanentlyChildrenAssociatedRecords(toRemove);
                batchRecords.push(...childrenToRemove);
            }
        }

        if (processChildren) {
            const checklists = uniqueRaws.reduce<PartialChecklist[]>((res, raw) => {
                if (raw.checklists?.length) {
                    let lists: PartialChecklist[] = raw.checklists.map((checklist, index) => ({
                        ...checklist,
                        order: index,
                        run_id: raw.id,
                    }));
                    if (removeAssociatedRecords && toRemove.length) {
                        const deletedRunIds = new Set(toRemove.map((run) => run.id));
                        lists = lists.filter((item) => !deletedRunIds.has(item.run_id)); // Filter out items that are already marked for deletion
                    }
                    res.push(...lists);
                }
                return res;
            }, []);

            const childRecords = await this.handlePlaybookChecklist({checklists, prepareRecordsOnly: true, processChildren});
            batchRecords.push(...childRecords);

            // Process property_fields and property_values
            const propertyFields = uniqueRaws.reduce<PartialPlaybookRunPropertyField[]>((res, raw) => {
                if (raw.property_fields?.length) {
                    res.push(...raw.property_fields);
                }
                return res;
            }, []);

            const propertyValues = uniqueRaws.reduce<PartialPlaybookRunPropertyValue[]>((res, raw) => {
                if (raw.property_values?.length) {
                    res.push(...raw.property_values);
                }
                return res;
            }, []);

            if (propertyFields.length) {
                const propertyFieldRecords = await this.handlePlaybookRunPropertyField({
                    propertyFields,
                    prepareRecordsOnly: true,
                });
                batchRecords.push(...propertyFieldRecords);
            }

            if (propertyValues.length) {
                const propertyValueRecords = await this.handlePlaybookRunPropertyValue({
                    propertyValues,
                    prepareRecordsOnly: true,
                });
                batchRecords.push(...propertyValueRecords);
            }
        }

        if (batchRecords.length && !prepareRecordsOnly) {
            await this.batchRecords(batchRecords, 'handlePlaybookRun batch');
        }

        return batchRecords;
    };

    /**
     * Handles the playbook checklist records.
     * @param {HandlePlaybookChecklistArgs} args - The arguments for handling playbook checklist records.
     * @param {boolean} args.prepareRecordsOnly - If true, only prepares the records without saving them.
     * @param {boolean} [args.processChildren] - If true, process child records.
     * @param {PlaybookChecklistWithRun[]} [args.checklists] - The playbook checklist records to handle.
     * @returns {Promise<Model[]>} - A promise that resolves to an array of handled playbook checklist records.
     */
    handlePlaybookChecklist = async ({checklists, prepareRecordsOnly, processChildren = false}: HandlePlaybookChecklistArgs): Promise<Model[]> => {
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
        const createOrUpdateRaws = uniqueRaws.reduce<PartialChecklist[]>((res, raw) => {
            const existingRecord = existingRecordsMap.get(raw.id);
            if (!existingRecord) {
                res.push(raw);
            } else if (shouldHandlePlaybookChecklistRecord(existingRecord, raw)) {
                res.push(raw);
            }

            return res;
        }, []);

        if (createOrUpdateRaws.length) {
            const records = await this.handleRecords({
                fieldName: 'id',
                tableName: PLAYBOOK_CHECKLIST,
                prepareRecordsOnly: true,
                createOrUpdateRawValues: createOrUpdateRaws,
                transformer: transformPlaybookChecklistRecord,
            }, 'handlePlaybookChecklist prepare');
            batchRecords.push(...records);
        }

        if (processChildren) {
            const items = uniqueRaws.reduce<PartialChecklistItem[]>((res, raw) => {
                if (raw.items?.length) {
                    const lists: PartialChecklistItem[] = raw.items.
                        map((item, index) => ({
                            ...item,
                            checklist_id: raw.id,
                            order: index,
                        }));

                    res.push(...lists);
                }
                return res;
            }, []);
            const childRecords = await this.handlePlaybookChecklistItem({items, prepareRecordsOnly: true});
            batchRecords.push(...childRecords);
        }

        if (batchRecords.length && !prepareRecordsOnly) {
            await this.batchRecords(batchRecords, 'handlePlaybookChecklist batch');
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
        const createOrUpdateRaws = uniqueRaws.reduce<PartialChecklistItem[]>((res, raw) => {
            const existingRecord = existingRecordsMap.get(raw.id);
            if (!existingRecord) {
                res.push(raw);
            } else if (shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)) {
                res.push(raw);
            }

            return res;
        }, []);

        if (!createOrUpdateRaws.length) {
            return [];
        }

        const records = await this.handleRecords({
            fieldName: 'id',
            tableName: PLAYBOOK_CHECKLIST_ITEM,
            prepareRecordsOnly: true,
            createOrUpdateRawValues: createOrUpdateRaws,
            transformer: transformPlaybookChecklistItemRecord,
        }, 'handlePlaybookChecklistItem prepare');

        if (records.length && !prepareRecordsOnly) {
            await this.batchRecords(records, 'handlePlaybookChecklistItem batch');
        }

        return records;
    };

    /**
     * Handles the playbook run property field records.
     * @param {HandlePlaybookRunPropertyFieldArgs} args - The arguments for handling playbook run property field records.
     * @param {boolean} args.prepareRecordsOnly - If true, only prepares the records without saving them.
     * @param {PlaybookRunPropertyField[]} [args.propertyFields] - The playbook run property field records to handle.
     * @returns {Promise<Model[]>} - A promise that resolves to an array of handled playbook run property field records.
     */
    handlePlaybookRunPropertyField = async ({propertyFields, prepareRecordsOnly = true}: HandlePlaybookRunPropertyFieldArgs): Promise<Model[]> => {
        if (!propertyFields?.length) {
            logWarning(
                'An empty or undefined "propertyFields" array has been passed to the handlePlaybookRunPropertyField method',
            );
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: propertyFields, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformPlaybookRunPropertyFieldRecord,
            createOrUpdateRawValues,
            tableName: PLAYBOOK_RUN_ATTRIBUTE,
            prepareRecordsOnly,
        }, 'handlePlaybookRunPropertyField');
    };

    /**
     * Handles the playbook run property value records.
     * @param {HandlePlaybookRunPropertyValueArgs} args - The arguments for handling playbook run property value records.
     * @param {boolean} args.prepareRecordsOnly - If true, only prepares the records without saving them.
     * @param {PlaybookRunPropertyValue[]} [args.propertyValues] - The playbook run property value records to handle.
     * @returns {Promise<Model[]>} - A promise that resolves to an array of handled playbook run property value records.
     */
    handlePlaybookRunPropertyValue = async ({propertyValues, prepareRecordsOnly = true}: HandlePlaybookRunPropertyValueArgs): Promise<Model[]> => {
        if (!propertyValues?.length) {
            logWarning(
                'An empty or undefined "propertyValues" array has been passed to the handlePlaybookRunPropertyValue method',
            );
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: propertyValues, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformPlaybookRunPropertyValueRecord,
            createOrUpdateRawValues,
            tableName: PLAYBOOK_RUN_ATTRIBUTE_VALUE,
            prepareRecordsOnly,
        }, 'handlePlaybookRunPropertyValue');
    };
};

export default PlaybookHandler;

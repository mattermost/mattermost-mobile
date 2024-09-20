// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {Navigation, Screens} from '@app/constants';
import {goToScreen} from '@app/screens/navigation';
import {isTablet} from '@app/utils/helpers';
import DatabaseManager from '@database/manager';
import {getDraft} from '@queries/servers/drafts';
import {logError} from '@utils/log';

export const switchToGlobalDrafts = async () => {
    const isTablelDevice = isTablet();
    if (isTablelDevice) {
        DeviceEventEmitter.emit(Navigation.NAVIGATION_HOME, Screens.GLOBAL_DRAFTS);
    } else {
        goToScreen(Screens.GLOBAL_DRAFTS, '', {}, {topBar: {visible: false}});
    }
};

export async function updateDraftFile(serverUrl: string, channelId: string, rootId: string, file: FileInfo, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const draft = await getDraft(database, channelId, rootId);
        if (!draft) {
            return {error: 'no draft'};
        }

        const i = draft.files.findIndex((v) => v.clientId === file.clientId);
        if (i === -1) {
            return {error: 'file not found'};
        }

        // We create a new list to make sure we re-render the draft input.
        const newFiles = [...draft.files];
        newFiles[i] = file;
        draft.prepareUpdate((d) => {
            d.files = newFiles;
            d.updateAt = Date.now();
        });

        if (!prepareRecordsOnly) {
            await operator.batchRecords([draft], 'updateDraftFile');
        }

        return {draft};
    } catch (error) {
        logError('Failed updateDraftFile', error);
        return {error};
    }
}

export async function removeDraftFile(serverUrl: string, channelId: string, rootId: string, clientId: string, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const draft = await getDraft(database, channelId, rootId);
        if (!draft) {
            return {error: 'no draft'};
        }

        const i = draft.files.findIndex((v) => v.clientId === clientId);
        if (i === -1) {
            return {error: 'file not found'};
        }

        if (draft.files.length === 1 && !draft.message) {
            draft.prepareDestroyPermanently();
        } else {
            draft.prepareUpdate((d) => {
                d.files = draft.files.filter((v, index) => index !== i);
                d.updateAt = Date.now();
            });
        }

        if (!prepareRecordsOnly) {
            await operator.batchRecords([draft], 'removeDraftFile');
        }

        return {draft};
    } catch (error) {
        logError('Failed removeDraftFile', error);
        return {error};
    }
}

export async function updateDraftMessage(serverUrl: string, channelId: string, rootId: string, message: string, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const draft = await getDraft(database, channelId, rootId);
        if (!draft) {
            if (!message) {
                return {};
            }

            const newDraft: Draft = {
                channel_id: channelId,
                root_id: rootId,
                message,
                update_at: Date.now(),
            };

            return operator.handleDraft({drafts: [newDraft], prepareRecordsOnly});
        }

        if (draft.message === message) {
            return {draft};
        }

        if (draft.files.length === 0 && !message) {
            draft.prepareDestroyPermanently();
        } else {
            draft.prepareUpdate((d) => {
                d.message = message;
                d.updateAt = Date.now();
            });
        }

        if (!prepareRecordsOnly) {
            await operator.batchRecords([draft], 'updateDraftMessage');
        }

        return {draft};
    } catch (error) {
        logError('Failed updateDraftMessage', error);
        return {error};
    }
}

export async function addFilesToDraft(serverUrl: string, channelId: string, rootId: string, files: FileInfo[], prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const draft = await getDraft(database, channelId, rootId);
        if (!draft) {
            const newDraft: Draft = {
                channel_id: channelId,
                root_id: rootId,
                files,
                message: '',
                update_at: Date.now(),
            };

            return operator.handleDraft({drafts: [newDraft], prepareRecordsOnly});
        }

        draft.prepareUpdate((d) => {
            d.files = [...draft.files, ...files];
            d.updateAt = Date.now();
        });

        if (!prepareRecordsOnly) {
            await operator.batchRecords([draft], 'addFilesToDraft');
        }

        return {draft};
    } catch (error) {
        logError('Failed addFilesToDraft', error);
        return {error};
    }
}

export const removeDraft = async (serverUrl: string, channelId: string, rootId = '') => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const draft = await getDraft(database, channelId, rootId);
        if (draft) {
            await database.write(async () => {
                await draft.destroyPermanently();
            });
        }

        return {draft};
    } catch (error) {
        logError('Failed removeDraft', error);
        return {error};
    }
};

export async function updateDraftPriority(serverUrl: string, channelId: string, rootId: string, postPriority: PostPriority, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const draft = await getDraft(database, channelId, rootId);
        if (!draft) {
            const newDraft: Draft = {
                channel_id: channelId,
                root_id: rootId,
                metadata: {
                    priority: postPriority,
                },
                update_at: Date.now(),
            };

            return operator.handleDraft({drafts: [newDraft], prepareRecordsOnly});
        }

        draft.prepareUpdate((d) => {
            d.metadata = {
                ...d.metadata,
                priority: postPriority,
            };
            d.updateAt = Date.now();
        });

        if (!prepareRecordsOnly) {
            await operator.batchRecords([draft], 'updateDraftPriority');
        }

        return {draft};
    } catch (error) {
        logError('Failed updateDraftPriority', error);
        return {error};
    }
}

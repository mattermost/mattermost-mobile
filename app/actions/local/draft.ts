// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, Image} from 'react-native';

import {Navigation, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getDraft} from '@queries/servers/drafts';
import {getCurrentChannelId, getCurrentTeamId, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {addChannelToTeamHistory} from '@queries/servers/team';
import {goToScreen, popTo} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {isTablet} from '@utils/helpers';
import {logError} from '@utils/log';
import {isParsableUrl} from '@utils/url';

import type {DraftScreenTab} from '@constants/draft';
import type {Model} from '@nozbe/watermelondb';

type goToScreenParams = {
    initialTab?: DraftScreenTab;
}

export const switchToGlobalDrafts = async (serverUrl: string, teamId?: string, initialTab?: DraftScreenTab, prepareRecordsOnly = false) => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const models: Model[] = [];

        let teamIdToUse = teamId;
        if (!teamId) {
            teamIdToUse = await getCurrentTeamId(database);
        }

        if (!teamIdToUse) {
            throw new Error('no team to switch to');
        }

        const currentChannelId = await getCurrentChannelId(database);
        await setCurrentTeamAndChannelId(operator, teamIdToUse, currentChannelId);
        const history = await addChannelToTeamHistory(operator, teamIdToUse, Screens.GLOBAL_DRAFTS, true);
        models.push(...history);

        if (!prepareRecordsOnly) {
            await operator.batchRecords(models, 'switchToGlobalDrafts');
        }
        const params: goToScreenParams = {};

        const isDraftAlreadyInNavigationStack = NavigationStore.getScreensInStack().includes(Screens.GLOBAL_DRAFTS);
        if (isDraftAlreadyInNavigationStack) {
            popTo(Screens.GLOBAL_DRAFTS);
            return {models};
        }

        params.initialTab = initialTab;

        const isTabletDevice = isTablet();
        if (isTabletDevice) {
            DeviceEventEmitter.emit(Navigation.NAVIGATION_HOME, Screens.GLOBAL_DRAFTS, params);
        } else {
            goToScreen(Screens.GLOBAL_DRAFTS, '', params, {topBar: {visible: false}});
        }

        return {models};
    } catch (error) {
        logError('Failed switchToGlobalDrafts', error);

        return {error};
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

export async function updateDraftMarkdownImageMetadata({
    serverUrl,
    channelId,
    rootId,
    imageMetadata,
    prepareRecordsOnly = false,
}: {
    serverUrl: string;
    channelId: string;
    rootId: string;
    imageMetadata: Dictionary<PostImage | undefined>;
    prepareRecordsOnly?: boolean;
}) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const draft = await getDraft(database, channelId, rootId);
        if (draft) {
            draft.prepareUpdate((d) => {
                d.metadata = {
                    ...d.metadata,
                    images: imageMetadata,
                };
                d.updateAt = Date.now();
            });
            if (!prepareRecordsOnly) {
                await operator.batchRecords([draft], 'updateDraftImageMetadata');
            }
        }
        return {draft};
    } catch (error) {
        logError('Failed updateDraftMarkdownImageMetadata', error);
        return {error};
    }
}

async function getImageMetadata(url: string) {
    let height = 0;
    let width = 0;
    let format;
    await new Promise((resolve) => {
        Image.getSize(
            url,
            (imageWidth, imageHeight) => {
                width = imageWidth;
                height = imageHeight;
                resolve(null);
            },
            (error) => {
                logError('Failed getImageMetadata to get image size', error);
            },
        );
    });

    /**
     * Regex Explanation:
     * \.       - Matches a literal period (e.g., before "jpg").
     * (\w+)    - Captures the file extension (letters, digits, or underscores).
     * (?=\?|$) - Ensures the extension is followed by "?" or the end of the URL.
     *
     * * Example Matches:
     * "https://example.com/image.jpg"         -> Matches "jpg"
     * "https://example.com/image.png?size=1"  -> Matches "png"
     * "https://example.com/file"              -> No match (no file extension).
     */
    const match = url.match(/\.(\w+)(?=\?|$)/);
    if (match) {
        format = match[1];
    }
    return {
        height,
        width,
        format,
        frame_count: 1,
        url,
    };
}

export async function parseMarkdownImages(markdown: string, imageMetadata: Dictionary<PostImage | undefined>) {
    // Regex break down
    // ([a-zA-Z][a-zA-Z\d+\-.]*):\/\/ - Matches any valid scheme (protocol), such as http, https, ftp, mailto, file, etc.
    // [^\s()<>]+ - Matches the main part of the URL, excluding spaces, parentheses, and angle brackets.
    // (?:\([^\s()<>]+\))* - Allows balanced parentheses inside the URL path or query parameters.
    // !\[.*?\]\((...)\) - Matches an image markdown syntax ![alt text](image url)
    const imageRegex = /!\[.*?\]\((([a-zA-Z][a-zA-Z\d+\-.]*):\/\/[^\s()<>]+(?:\([^\s()<>]+\))*)\)/g;
    const matches = Array.from(markdown.matchAll(imageRegex));

    const promises = matches.reduce<Array<Promise<PostImage & {url: string}>>>((result, match) => {
        const imageUrl = match[1];
        if (isParsableUrl(imageUrl)) {
            result.push(getImageMetadata(imageUrl));
        }
        return result;
    }, []);

    const metadataArray = await Promise.all(promises);
    metadataArray.forEach((metadata) => {
        if (metadata) {
            imageMetadata[metadata.url] = metadata;
        }
    });
}

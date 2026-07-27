// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import {DeviceEventEmitter} from 'react-native';

import {Navigation, Screens} from '@constants';
import {MM_TABLES} from '@constants/database';
import {DraftOutboxOperation, DraftOutboxStatus, type DraftScreenTab} from '@constants/draft';
import {PostTypes} from '@constants/post';
import DatabaseManager from '@database/manager';
import {getChannelById} from '@queries/servers/channel';
import {mutateDraftAndOutbox, prepareDraftOutbox, type OutboxIntent} from '@queries/servers/drafts';
import {getCurrentTeamId, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {addChannelToTeamHistory} from '@queries/servers/team';
import {dismissAllRoutesAndPopToScreen} from '@screens/navigation';
import {NavigationStore} from '@store/navigation_store';
import {draftContentFingerprint} from '@utils/draft/sync';
import {getExtensionFromMime} from '@utils/file';
import {isTablet} from '@utils/helpers';
import {logError} from '@utils/log';
import {removeImageProxyForKey} from '@utils/markdown';
import {urlSafeBase64Encode} from '@utils/security';
import {isParsableUrl} from '@utils/url';

import type {Database, Model} from '@nozbe/watermelondb';
import type DraftModel from '@typings/database/models/servers/draft';
import type DraftOutboxModel from '@typings/database/models/servers/draft_outbox';

const {SERVER: {DRAFT}} = MM_TABLES;

/**
 * resolveTeamScope: the team scope stamped onto a new/updated DraftOutbox row for a channel.
 * DM/GM channels already carry an empty teamId, and a missing channel falls back to '' too.
 */
const resolveTeamScope = async (database: Database, channelId: string): Promise<string> => {
    const channel = await getChannelById(database, channelId);
    return channel?.teamId ?? '';
};

/**
 * fingerprintDraft: fingerprint the current server-visible content of a Draft so a queued DELETE
 * can later distinguish a stale replica echo from genuinely new content.
 */
const fingerprintDraft = (draft: DraftModel): string => {
    return draftContentFingerprint({
        message: draft.message,
        type: draft.type,
        props: draft.props,
        fileIds: draft.fileIds ?? [],
        priority: draft.metadata?.priority,
    });
};

/**
 * prepareEmptyTransition: shared handling for a Draft whose visible content just became empty
 * (message '' and, for the caller to decide, possibly no files). Produces the Draft + DraftOutbox
 * records for the three empty branches:
 *  - potentiallyDispatched: the draft may exist on the server, so enqueue a DELETE (keepLocal when
 *    local-only content such as attachments remains) and either retain the visible draft (message
 *    cleared) or destroy it.
 *  - not dispatched but local content remains: park a blocked/unsyncable_empty outbox and retain
 *    the visible draft; never enqueue a delete for something the server never saw.
 *  - not dispatched and nothing local worth keeping: destroy the draft and drop any outbox row.
 */
const prepareEmptyTransition = async (
    database: Database,
    channelId: string,
    rootId: string,
    draft: DraftModel,
    outbox: DraftOutboxModel | undefined,
    hasLocalContent: boolean,
): Promise<Model[]> => {
    const teamId = await resolveTeamScope(database, channelId);
    const potentiallyDispatched = (outbox != null && outbox.operation === DraftOutboxOperation.Upsert) || ((draft.serverUpdateAt ?? 0) > 0);

    if (potentiallyDispatched) {
        const deletedFingerprint = fingerprintDraft(draft);
        const models: Model[] = [];
        if (hasLocalContent) {
            models.push(draft.prepareUpdate((d) => {
                d.message = '';
                d.updateAt = Date.now();
            }));
        } else {
            models.push(draft.prepareDestroyPermanently());
        }
        models.push(...prepareDraftOutbox(database, channelId, rootId, teamId, outbox, {
            type: 'delete',
            keepLocal: hasLocalContent,
            deletedFingerprint,
        }));
        return models;
    }

    if (hasLocalContent) {
        return [
            draft.prepareUpdate((d) => {
                d.message = '';
                d.updateAt = Date.now();
            }),
            ...prepareDraftOutbox(database, channelId, rootId, teamId, outbox, {type: 'park'}),
        ];
    }

    return [
        draft.prepareDestroyPermanently(),
        ...prepareDraftOutbox(database, channelId, rootId, teamId, outbox, {type: 'remove'}),
    ];
};

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

        await setCurrentTeamAndChannelId(operator, teamIdToUse, '');
        const history = await addChannelToTeamHistory(operator, teamIdToUse, Screens.GLOBAL_DRAFTS, true);
        models.push(...history);

        if (!prepareRecordsOnly) {
            await operator.batchRecords(models, 'switchToGlobalDrafts');
        }
        const params: goToScreenParams = {};

        const isDraftAlreadyInNavigationStack = NavigationStore.getScreensInStack().includes(Screens.GLOBAL_DRAFTS);
        if (isDraftAlreadyInNavigationStack) {
            dismissAllRoutesAndPopToScreen(Screens.GLOBAL_DRAFTS);
            return {models};
        }

        params.initialTab = initialTab;

        const isTabletDevice = isTablet();
        if (isTabletDevice) {
            DeviceEventEmitter.emit(Navigation.NAVIGATION_HOME, Screens.GLOBAL_DRAFTS, params);
        } else {
            await NavigationStore.waitUntilScreenHasLoaded(Screens.HOME);
            dismissAllRoutesAndPopToScreen(Screens.GLOBAL_DRAFTS, params);
        }

        return {models};
    } catch (error) {
        logError('Failed switchToGlobalDrafts', error);

        return {error};
    }
};

export async function updateDraftFile(serverUrl: string, channelId: string, rootId: string, file: FileInfo) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let result: DraftModel | undefined;
        let earlyError: string | undefined;

        await mutateDraftAndOutbox(database, channelId, rootId, async ({draft, outbox}) => {
            if (!draft) {
                earlyError = 'no draft';
                return [];
            }

            const i = draft.files.findIndex((v) => v.clientId === file.clientId);
            if (i === -1) {
                earlyError = 'file not found';
                return [];
            }

            result = draft;

            // We create a new list to make sure we re-render the draft input.
            const newFiles = [...draft.files];
            newFiles[i] = file;

            const existingFileIds = draft.fileIds ?? [];
            const completedId = file.id;

            if (completedId && !existingFileIds.includes(completedId)) {
                // Upload finished: the attachment now has a portable server id. Persist it, then
                // coalesce a pending upsert when the draft can POST (message present) or park it as
                // unsyncable_empty when the message is still empty (attachments alone never POST).
                const newFileIds = [...existingFileIds, completedId];
                const teamId = await resolveTeamScope(database, channelId);
                const intent: OutboxIntent = draft.message.length > 0 ? {type: 'upsert'} : {type: 'park'};
                return [
                    draft.prepareUpdate((d) => {
                        d.files = newFiles;
                        d.fileIds = newFileIds;
                        d.updateAt = Date.now();
                    }),
                    ...prepareDraftOutbox(database, channelId, rootId, teamId, outbox, intent),
                ];
            }

            // Progress-only, device-local change: update the visible files but do not bump the
            // portable generation or disturb an existing waiting_for_upload outbox.
            return [draft.prepareUpdate((d) => {
                d.files = newFiles;
                d.updateAt = Date.now();
            })];
        });

        if (earlyError) {
            return {error: earlyError};
        }

        return {draft: result};
    } catch (error) {
        logError('Failed updateDraftFile', error);
        return {error};
    }
}

export async function removeDraftFile(serverUrl: string, channelId: string, rootId: string, clientId: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let result: DraftModel | undefined;
        let earlyError: string | undefined;

        await mutateDraftAndOutbox(database, channelId, rootId, async ({draft, outbox}) => {
            if (!draft) {
                earlyError = 'no draft';
                return [];
            }

            const i = draft.files.findIndex((v) => v.clientId === clientId);
            if (i === -1) {
                earlyError = 'file not found';
                return [];
            }

            result = draft;

            const removed = draft.files[i];
            const newFiles = draft.files.filter((v, index) => index !== i);
            const existingFileIds = draft.fileIds ?? [];
            const newFileIds = removed.id ? existingFileIds.filter((id) => id !== removed.id) : existingFileIds;
            const portableChanged = newFileIds.length !== existingFileIds.length;

            // Removing the last file with no message empties the draft: run the shared transition.
            if (newFiles.length === 0 && !draft.message) {
                return prepareEmptyTransition(database, channelId, rootId, draft, outbox, false);
            }

            const models: Model[] = [draft.prepareUpdate((d) => {
                d.files = newFiles;
                if (removed.id) {
                    d.fileIds = newFileIds;
                }
                d.updateAt = Date.now();
            })];

            if (portableChanged) {
                // A completed (portable) attachment was removed -> portable content changed. It can
                // sync when the message can POST, otherwise it stays parked as unsyncable_empty.
                const teamId = await resolveTeamScope(database, channelId);
                const intent: OutboxIntent = draft.message.length > 0 ? {type: 'upsert'} : {type: 'park'};
                models.push(...prepareDraftOutbox(database, channelId, rootId, teamId, outbox, intent));
            } else if (
                outbox &&
                draft.message.length === 0 &&
                newFileIds.length === 0 &&
                (outbox.status === DraftOutboxStatus.WaitingForUpload || outbox.status === DraftOutboxStatus.BlockedUpload)
            ) {
                // Removed a still-uploading/failed attachment and nothing portable remains: there is
                // nothing to POST, so drop the outbox row rather than leaving a stale upload intent.
                const teamId = await resolveTeamScope(database, channelId);
                models.push(...prepareDraftOutbox(database, channelId, rootId, teamId, outbox, {type: 'remove'}));
            }

            return models;
        });

        if (earlyError) {
            return {error: earlyError};
        }

        return {draft: result};
    } catch (error) {
        logError('Failed removeDraftFile', error);
        return {error};
    }
}

export async function updateDraftMessage(serverUrl: string, channelId: string, rootId: string, message: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let result: DraftModel | undefined;

        await mutateDraftAndOutbox(database, channelId, rootId, async ({draft, outbox}) => {
            if (!draft) {
                if (!message) {
                    return [];
                }

                // First content edit for this key: create the visible draft and a pending upsert.
                const teamId = await resolveTeamScope(database, channelId);
                const created = database.collections.get<DraftModel>(DRAFT).prepareCreate((d) => {
                    d.channelId = channelId;
                    d.rootId = rootId;
                    d.message = message;
                    d.updateAt = Date.now();
                    d.files = [];
                    d.fileIds = [];
                });
                result = created;
                return [created, ...prepareDraftOutbox(database, channelId, rootId, teamId, outbox, {type: 'upsert'})];
            }

            result = draft;

            if (draft.message === message) {
                // No content change (covers the empty-stays-empty stale-cleanup no-op too).
                return [];
            }

            if (message) {
                // A genuine content edit; coalesce a pending upsert (flips a delete/blocked back to pending).
                const teamId = await resolveTeamScope(database, channelId);
                return [
                    draft.prepareUpdate((d) => {
                        d.message = message;
                        d.updateAt = Date.now();
                    }),
                    ...prepareDraftOutbox(database, channelId, rootId, teamId, outbox, {type: 'upsert'}),
                ];
            }

            // Message cleared to empty: attachment-only content stays visible, everything else empties.
            const hasLocalContent = draft.files.length > 0;
            return prepareEmptyTransition(database, channelId, rootId, draft, outbox, hasLocalContent);
        });

        return {draft: result};
    } catch (error) {
        logError('Failed updateDraftMessage', error);
        return {error};
    }
}

export async function addFilesToDraft(serverUrl: string, channelId: string, rootId: string, files: FileInfo[]) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let result: DraftModel | undefined;

        await mutateDraftAndOutbox(database, channelId, rootId, async ({draft, outbox}) => {
            const teamId = await resolveTeamScope(database, channelId);

            // Newly-added attachments usually have no server id yet; capture any that already do.
            const addedCompletedIds = files.filter((f): f is FileInfo & {id: string} => Boolean(f.id)).map((f) => f.id);

            const message = draft?.message ?? '';
            const existingFileIds = draft?.fileIds ?? [];
            const newFileIds = Array.from(new Set([...existingFileIds, ...addedCompletedIds]));

            const models: Model[] = [];
            if (draft) {
                result = draft;
                models.push(draft.prepareUpdate((d) => {
                    d.files = [...draft.files, ...files];
                    d.fileIds = newFileIds;
                    d.updateAt = Date.now();
                }));
            } else {
                const created = database.collections.get<DraftModel>(DRAFT).prepareCreate((d) => {
                    d.channelId = channelId;
                    d.rootId = rootId;
                    d.message = '';
                    d.updateAt = Date.now();
                    d.files = files;
                    d.fileIds = newFileIds;
                });
                result = created;
                models.push(created);
            }

            // An empty message can never POST, so attachments alone are never a pending upsert:
            //  - message present -> pending upsert (portable).
            //  - empty message but a completed (server-backed) attachment -> parked unsyncable_empty.
            //  - empty message with only in-progress uploads -> waiting_for_upload to protect them.
            let intent: OutboxIntent;
            if (message.length > 0) {
                intent = {type: 'upsert'};
            } else if (newFileIds.length > 0) {
                intent = {type: 'park'};
            } else {
                intent = {type: 'waitingForUpload'};
            }
            models.push(...prepareDraftOutbox(database, channelId, rootId, teamId, outbox, intent));

            return models;
        });

        return {draft: result};
    } catch (error) {
        logError('Failed addFilesToDraft', error);
        return {error};
    }
}

export const removeDraft = async (serverUrl: string, channelId: string, rootId = '') => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let result: DraftModel | undefined;

        await mutateDraftAndOutbox(database, channelId, rootId, async ({draft, outbox}) => {
            if (!draft) {
                return [];
            }

            result = draft;

            // Explicit user delete: fingerprint the current content, remove the visible draft, and
            // queue a non-keepLocal DELETE so the server representation is removed too.
            const deletedFingerprint = fingerprintDraft(draft);
            const teamId = await resolveTeamScope(database, channelId);
            return [
                draft.prepareDestroyPermanently(),
                ...prepareDraftOutbox(database, channelId, rootId, teamId, outbox, {
                    type: 'delete',
                    keepLocal: false,
                    deletedFingerprint,
                }),
            ];
        });

        return {draft: result};
    } catch (error) {
        logError('Failed removeDraft', error);
        return {error};
    }
};

export async function updateDraftPriority(serverUrl: string, channelId: string, rootId: string, postPriority: PostPriority) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let result: DraftModel | undefined;

        await mutateDraftAndOutbox(database, channelId, rootId, async ({draft, outbox}) => {
            const teamId = await resolveTeamScope(database, channelId);

            let message: string;
            const models: Model[] = [];
            if (draft) {
                result = draft;
                message = draft.message;
                models.push(draft.prepareUpdate((d) => {
                    d.metadata = {
                        ...d.metadata,
                        priority: postPriority,
                    };
                    d.updateAt = Date.now();
                }));
            } else {
                const created = database.collections.get<DraftModel>(DRAFT).prepareCreate((d) => {
                    d.channelId = channelId;
                    d.rootId = rootId;
                    d.message = '';
                    d.updateAt = Date.now();
                    d.files = [];
                    d.fileIds = [];
                    d.metadata = {priority: postPriority};
                });
                result = created;
                models.push(created);
                message = '';
            }

            // Priority is portable metadata, but an empty message can never POST: keep it parked
            // as unsyncable until a genuine message edit flips it to a pending upsert.
            const intent = message.length > 0 ? {type: 'upsert'} as const : {type: 'park'} as const;
            models.push(...prepareDraftOutbox(database, channelId, rootId, teamId, outbox, intent));
            return models;
        });

        return {draft: result};
    } catch (error) {
        logError('Failed updateDraftPriority', error);
        return {error};
    }
}

export async function updateDraftBoRConfig(serverUrl: string, channelId: string, rootId: string, postBoRConfig: PostBoRConfig) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let result: DraftModel | undefined;
        const draftType = postBoRConfig.enabled ? PostTypes.BURN_ON_READ : '';

        await mutateDraftAndOutbox(database, channelId, rootId, async ({draft, outbox}) => {
            const teamId = await resolveTeamScope(database, channelId);

            let message: string;
            const models: Model[] = [];
            if (draft) {
                result = draft;
                message = draft.message;
                models.push(draft.prepareUpdate((d) => {
                    d.metadata = {
                        ...d.metadata,
                        borConfig: postBoRConfig,
                    };
                    d.type = draftType;
                    d.updateAt = Date.now();
                }));
            } else {
                const created = database.collections.get<DraftModel>(DRAFT).prepareCreate((d) => {
                    d.channelId = channelId;
                    d.rootId = rootId;
                    d.message = '';
                    d.updateAt = Date.now();
                    d.files = [];
                    d.fileIds = [];
                    d.metadata = {borConfig: postBoRConfig};
                    d.type = draftType;
                });
                result = created;
                models.push(created);
                message = '';
            }

            // Burn-on-read is portable metadata, but an empty message can never POST: park it as
            // unsyncable until a genuine message edit flips it to a pending upsert.
            const intent = message.length > 0 ? {type: 'upsert'} as const : {type: 'park'} as const;
            models.push(...prepareDraftOutbox(database, channelId, rootId, teamId, outbox, intent));
            return models;
        });

        return {draft: result};
    } catch (error) {
        logError('Failed updateDraftBoRConfig', error);
        return {error};
    }
}

export async function updateDraftMarkdownImageMetadata({
    serverUrl,
    channelId,
    rootId,
    imageMetadata,
}: {
    serverUrl: string;
    channelId: string;
    rootId: string;
    imageMetadata: Dictionary<PostImage | undefined>;
}) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let result: DraftModel | undefined;

        // Markdown image dimensions are device-local render hints, not portable content: update
        // the visible draft only, never touching the DraftOutbox row or the portable generation.
        await mutateDraftAndOutbox(database, channelId, rootId, ({draft}) => {
            if (!draft) {
                return [];
            }

            result = draft;
            return [draft.prepareUpdate((d) => {
                d.metadata = {
                    ...d.metadata,
                    images: imageMetadata,
                };
                d.updateAt = Date.now();
            })];
        });

        return {draft: result};
    } catch (error) {
        logError('Failed updateDraftMarkdownImageMetadata', error);
        return {error};
    }
}

async function getImageMetadata(serverUrl: string, url: string) {
    let format;
    const sourceKey = removeImageProxyForKey(url);
    const cacheKey = `uid-${urlSafeBase64Encode(sourceKey)}`;
    const image = await Image.loadAsync({uri: url, cacheKey, cachePath: urlSafeBase64Encode(serverUrl)});

    if (image.mediaType) {
        format = getExtensionFromMime(image.mediaType);
    } else {
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
    }

    return {
        height: image.height,
        width: image.width,
        format,
        frame_count: 1,
        url,
    };
}

export async function parseMarkdownImages(serverUrl: string, markdown: string, imageMetadata: Dictionary<PostImage | undefined>) {
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
            result.push(getImageMetadata(serverUrl, imageUrl));
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

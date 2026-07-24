// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PostTypes} from '@constants/post';

// DraftLike is the minimal set of fields the pure sync helpers read from a Draft.
// A WatermelonDB DraftModel instance satisfies this shape, as does a plain object
// built from one, which keeps these functions free of any database dependency.
type DraftLike = {
    channelId: string;
    rootId: string;
    message: string;
    type: PostTypesUserCreatable | null;
    props: DraftProps | null;
    fileIds: string[];
    metadata?: PostMetadata;
};

// NormalizedDraft is the persistence-ready shape produced from a server DraftApi.
// It uses the DraftModel property names so a later phase can assign the values
// directly onto a prepared record. It intentionally never carries a record id or
// a local update_at; the caller stamps update_at when content actually changes.
type NormalizedDraft = {
    channelId: string;
    rootId: string;
    message: string;
    serverUpdateAt: number;
    type: PostTypesUserCreatable | null;
    props: DraftProps;
    fileIds: string[];
    files: FileInfo[];
    metadata?: PostMetadata;
};

type BoRDurations = {
    borDurationSeconds: number;
    borMaximumTimeToLiveSeconds: number;
};

/**
 * reconstructDraftBoRConfig: pure, fail-closed reconstruction of a draft's burn-on-read
 * config. The duration values live in server config (not in draft props) so the caller
 * passes them in. Returns null when the draft is not a burn-on-read draft, and also null
 * (fail closed) when it is a burn-on-read draft but valid positive durations are not
 * available — never fabricate durations.
 */
export const reconstructDraftBoRConfig = (
    serverType: string | null | undefined,
    durations: BoRDurations | undefined,
): PostBoRConfig | null => {
    if (serverType !== PostTypes.BURN_ON_READ) {
        return null;
    }

    if (!durations || durations.borDurationSeconds <= 0 || durations.borMaximumTimeToLiveSeconds <= 0) {
        return null;
    }

    return {
        enabled: true,
        borDurationSeconds: durations.borDurationSeconds,
        borMaximumTimeToLiveSeconds: durations.borMaximumTimeToLiveSeconds,
    };
};

/**
 * isSyncableDraft: a draft is only syncable when it has message content. Empty-message
 * drafts (attachment-only, priority-only, burn-on-read-only, type/props-only) are never
 * synced because the server treats an empty-message upsert as a delete.
 */
export const isSyncableDraft = (draft: DraftLike): boolean => {
    return draft.message.length > 0;
};

/**
 * buildDraftUpsertRequest: build the server POST body from a local draft. Sends ONLY the
 * server-owned fields; local-only file fields (localPath, clientId, bytesRead, failed,
 * upload progress) and local-only draft fields (record id, server_update_at) are never
 * serialized. Returns null for a non-syncable (empty message) draft so callers cannot
 * accidentally POST an empty draft that the server would interpret as a delete.
 */
export const buildDraftUpsertRequest = (draft: DraftLike): DraftUpsertRequest | null => {
    if (!isSyncableDraft(draft)) {
        return null;
    }

    const request: DraftUpsertRequest = {
        channel_id: draft.channelId,
        root_id: draft.rootId,
        message: draft.message,
        type: draft.type ?? '',
        props: draft.props ?? {},
        file_ids: draft.fileIds ?? [],
    };

    const priority = draft.metadata?.priority;
    if (priority) {
        request.priority = priority;
    }

    return request;
};

/**
 * normalizeServerDraft: map a server DraftApi into a persistence-ready NormalizedDraft.
 * Server update_at is captured as server_update_at (an observation hint) and never as the
 * local update_at. file_ids are copied exactly, even when metadata.files is unavailable, so
 * attachment IDs are never lost and local paths are never invented. Priority and burn-on-read
 * config are reconstructed into metadata; burn-on-read fails closed when durations are missing.
 */
export const normalizeServerDraft = (
    serverDraft: DraftApi,
    durations?: BoRDurations,
): NormalizedDraft => {
    const metadata: PostMetadata = {};

    if (serverDraft.priority) {
        metadata.priority = serverDraft.priority;
    }

    const borConfig = reconstructDraftBoRConfig(serverDraft.type, durations);
    if (borConfig) {
        metadata.borConfig = borConfig;
    }

    return {
        channelId: serverDraft.channel_id,
        rootId: serverDraft.root_id,
        message: serverDraft.message,
        serverUpdateAt: serverDraft.update_at,
        type: serverDraft.type === PostTypes.BURN_ON_READ ? PostTypes.BURN_ON_READ : '',
        props: serverDraft.props ?? {},
        fileIds: serverDraft.file_ids ?? [],
        files: serverDraft.metadata?.files ?? [],
        metadata: Object.keys(metadata).length ? metadata : undefined,
    };
};

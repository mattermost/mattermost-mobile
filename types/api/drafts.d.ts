// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// DraftProps carries server draft props round-tripped by mobile even when mobile
// does not interpret them. Absent props normalize to an empty object.
type DraftProps = Record<string, unknown>;

// DraftApi is the server Draft JSON shape (server model.Draft) as returned by the
// drafts REST endpoints. It is the wire representation, distinct from the local
// WatermelonDB Draft model.
type DraftApi = {
    create_at: number;
    update_at: number;
    delete_at: number;
    user_id: string;
    channel_id: string;
    root_id: string;
    message: string;
    type: PostType;
    props: DraftProps;
    file_ids: string[];
    metadata?: PostMetadata;
    priority?: PostPriority;
};

// DraftUpsertRequest is the POST body accepted by the server drafts endpoint.
// Only these fields are ever sent from mobile; local-only fields are never serialized.
type DraftUpsertRequest = {
    channel_id: string;
    root_id: string;
    message: string;
    type: PostType;
    props: DraftProps;
    file_ids: string[];
    priority?: PostPriority;
};

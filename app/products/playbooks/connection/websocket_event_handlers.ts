// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handlePostEdited = async (serverUrl: string, msg: WebSocketMessage<any>) => {
    // TODO: When we support custom post types, we may need to replicate the plugin behaviour here.
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handlePostDeleted = async (serverUrl: string, msg: WebSocketMessage<any>) => {
    // TODO: When we support custom post types, we may need to replicate the plugin behaviour here.
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleWebsocketUserAdded = async (serverUrl: string, msg: WebSocketMessage<any>) => {
    // TODO: Fetch playbook runs for the channel to which the user was just added.
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleWebsocketUserRemoved = async (serverUrl: string, msg: WebSocketMessage<any>) => {
    // TODO: Discard playbook runs for the channel to which the user was just removed.
    // Note this is contingent on our only viewing runs while inside a channel. If a user remains
    // a participant and we list active runs elsewhere, this behaviour may need to change.
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleChannelUpdated = async (serverUrl: string, msg: WebSocketMessage<any>) => {
    // TODO: If the channel has one or more playbook runs, fetch those playbook runs again
    // since some runs derive their run name from the channel itself. (Is this still true?)
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handlePlaybookRunUpdated = async (serverUrl: string, msg: WebSocketMessage<any>) => {
    // TODO: If the playbook run in view, update it. We also need to handle a playbook run
    // being finished and changing our global state.
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handlePlaybookRunCreated = async (serverUrl: string, msg: WebSocketMessage<any>) => {
    // TODO: Change our global state to reflect the newly created run.
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handlePlaybookCreated = async (serverUrl: string, msg: WebSocketMessage<any>) => {
    // No action required on mobile for now.
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handlePlaybookArchived = async (serverUrl: string, msg: WebSocketMessage<any>) => {
    // No action required on mobile for now.
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handlePlaybookRestored = async (serverUrl: string, msg: WebSocketMessage<any>) => {
    // No action required on mobile for now.
};

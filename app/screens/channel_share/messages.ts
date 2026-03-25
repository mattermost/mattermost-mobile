// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages} from 'react-intl';

export const messages = defineMessages({
    addWorkspace: {
        id: 'channel_share.add_workspace',
        defaultMessage: 'Add workspace',
    },
    addWorkspaceSheetTitle: {
        id: 'channel_share.add_workspace_sheet.title',
        defaultMessage: 'Connected Workspaces',
    },
    addWorkspaceSheetSubtitle: {
        id: 'channel_share.add_workspace_sheet.subtitle',
        defaultMessage: 'Select a connected workspace to share this channel with',
    },
    addWorkspaceSheetAllConnected: {
        id: 'channel_share.add_workspace_sheet.all_connected',
        defaultMessage: 'All connected workspaces are already sharing this channel.',
    },
    pendingSave: {
        id: 'channel_share.status.pending_save',
        defaultMessage: 'Pending save',
    },
    saving: {
        id: 'channel_share.status.saving',
        defaultMessage: 'Saving',
    },
    online: {
        id: 'channel_share.status.online',
        defaultMessage: 'Online',
    },
    connectionPending: {
        id: 'channel_share.status.connection_pending',
        defaultMessage: 'Connection pending',
    },
    offline: {
        id: 'channel_share.status.offline',
        defaultMessage: 'Offline',
    },
    workspacesSharingThisChannel: {
        id: 'channel_share.workspaces_sharing_this_channel',
        defaultMessage: 'Workspaces this channel is shared with',
    },
    noWorkspacesSharingThisChannel: {
        id: 'channel_share.no_workspaces_sharing_this_channel',
        defaultMessage: 'This channel is not shared with any connected workspaces yet.',
    },
    unshareConfirmTitle: {
        id: 'channel_share.unshare_confirm_title',
        defaultMessage: 'Remove sharing from {connectionPhrase}?',
    },
    unshareConfirmConnectionPhrase: {
        id: 'channel_share.unshare_confirm_connection_phrase',
        defaultMessage: '{count, plural, one {this connection} other {these connections}}',
    },
    unshareConfirmMessage: {
        id: 'channel_share.unshare_confirm_message',
        defaultMessage: 'This will unshare the channel {channelName} with the {workspaceList} connected {count, plural, one {workspace} other {workspaces}}. Are you sure you want to unshare?',
    },
    remove: {
        id: 'channel_share.remove',
        defaultMessage: 'Remove',
    },
    removeWorkspaceLabel: {
        id: 'channel_share.remove_workspace_label',
        defaultMessage: 'Remove {workspaceName}',
    },
    cancel: {
        id: 'channel_share.cancel',
        defaultMessage: 'Cancel',
    },
    save: {
        id: 'channel_share.save',
        defaultMessage: 'Save',
    },
    connectedWorkspaces: {
        id: 'channel_share.connected_workspaces',
        defaultMessage: 'Connected workspaces',
    },
    errorTitle: {
        id: 'channel_share.error_title',
        defaultMessage: 'Error',
    },
    shareWithConnectedWorkspaces: {
        id: 'channel_settings.share_with_connected_workspaces',
        defaultMessage: 'Share with connected workspaces',
    },
    shareWithConnectedWorkspacesDescription: {
        id: 'channel_share.share_with_connected_workspaces_description',
        defaultMessage: 'Collaborate with trusted organizations in this channel. Connections must be defined by a system admin.',
    },
    noRemotesWarning: {
        id: 'channel_share.no_remotes_warning',
        defaultMessage: 'No connected workspaces are available. Contact your system admin to add one.',
    },
    fetchErrorTitle: {
        id: 'channel_share.fetch_error_title',
        defaultMessage: 'Failed to load connected workspaces or connections',
    },
});

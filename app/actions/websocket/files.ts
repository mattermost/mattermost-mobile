// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import EphemeralStore from '@store/ephemeral_store';
import {logDebug} from '@utils/log';
import {showSnackBar} from '@utils/snack_bar';

export async function handleFileDownloadRejected(serverUrl: string, msg: WebSocketMessage) {
    try {
        const data = msg.data as FileDownloadRejectedEvent;

        logDebug('[handleFileDownloadRejected] Received event data:', JSON.stringify(data));

        const {file_id: fileId, rejection_reason: rejectionReason, download_type: downloadType} = data;

        if (!fileId) {
            logDebug('[handleFileDownloadRejected] No file_id in event, skipping');
            return;
        }

        // Track this file as rejected in ephemeral store (with the rejection reason)
        EphemeralStore.addRejectedFile(fileId, rejectionReason);

        // Handle different download types with different UX:
        // - Thumbnail: Background load, silent failure (no notification)
        // - Preview: Could be auto-load or user click, only notify if seems user-initiated
        // - File: User explicitly clicked download, always notify
        // - Public: User requested public link, always notify

        if (downloadType === 'thumbnail') {
            // Thumbnails are loaded automatically in the background
            // Don't show notification to avoid annoying users
            return;
        }

        if (downloadType === 'preview') {
            // Preview could be:
            // a) Auto-loaded in SingleImageView in channel list (background)
            // b) User opened gallery/preview modal
            // For mobile, we can't easily distinguish, so we'll show notification
            // but only if rejection reason looks user-facing
            // Fall through to show snackbar
        }

        logDebug('[handleFileDownloadRejected] Showing snackbar with rejection reason:', rejectionReason);

        // Show snackbar with the plugin's rejection message directly
        // Only pass customMessage if there's actually a message to show
        showSnackBar({
            barType: SNACK_BAR_TYPE.FILE_DOWNLOAD_REJECTED,
            customMessage: rejectionReason || undefined,
            type: 'error',
        });
    } catch (error) {
        logDebug('[handleFileDownloadRejected] Error handling event:', error);

        // Silently fail - don't crash the app for file rejection events
    }
}

export async function handleShowToast(serverUrl: string, msg: WebSocketMessage) {
    try {
        const {message} = msg.data;

        if (!message) {
            return;
        }

        // Display generic toast from plugin using dedicated snackbar type
        showSnackBar({
            barType: SNACK_BAR_TYPE.PLUGIN_TOAST,
            customMessage: message,
            type: 'default',
        });
    } catch (error) {
        // Silently fail - don't crash the app for toast events
    }
}

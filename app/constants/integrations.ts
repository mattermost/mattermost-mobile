// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const VALID_TYPES = new Set(['input', 'textarea', 'number', 'email', 'tel', 'url', 'password']);

/** Keep in sync with server/public/model/integration_action.go MaxDialogFileIds. */
export const MAX_DIALOG_FILE_IDS = 10;

export default {
    VALID_TYPES,
    MAX_DIALOG_FILE_IDS,
};

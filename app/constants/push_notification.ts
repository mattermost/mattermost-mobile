// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessage} from 'react-intl';

// Needed for localization on iOS native side
export const notVerifiedErrorMessage = defineMessage({
    id: 'native.ios.notifications.not_verified',
    defaultMessage: 'We could not verify this notification with the server',
});

export const CATEGORY = 'CAN_REPLY';

export const REPLY_ACTION = 'REPLY_ACTION';

export const NOTIFICATION_TYPE = {
    CLEAR: 'clear',
    MESSAGE: 'message',
    SESSION: 'session',
};

export const NOTIFICATION_SUB_TYPE = {
    CALLS: 'calls',
};

export default {
    CATEGORY,
    NOTIFICATION_TYPE,
    REPLY_ACTION,
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages} from 'react-intl';

export const labels = {
    standard: defineMessages({
        label: {
            id: 'post_priority.picker.label.standard',
            defaultMessage: 'Standard',
        },
    }),
    urgent: defineMessages({
        label: {
            id: 'post_priority.picker.label.urgent',
            defaultMessage: 'Urgent',
        },
    }),
    important: defineMessages({
        label: {
            id: 'post_priority.picker.label.important',
            defaultMessage: 'Important',
        },
    }),
    requestAck: defineMessages({
        label: {
            id: 'post_priority.picker.label.request_ack',
            defaultMessage: 'Request acknowledgement',
        },
        description: {
            id: 'post_priority.picker.label.request_ack.description',
            defaultMessage: 'An acknowledgement button will appear with your message',
        },
    }),
    persistentNotifications: defineMessages({
        label: {
            id: 'post_priority.picker.label.persistent_notifications',
            defaultMessage: 'Send persistent notifications',
        },
        description: {
            id: 'post_priority.picker.label.persistent_notifications.description',
            defaultMessage: 'Recipients are notified every {interval, plural, one {minute} other {{interval} minutes}} until they acknowledge or reply.',
        },
    }),
};

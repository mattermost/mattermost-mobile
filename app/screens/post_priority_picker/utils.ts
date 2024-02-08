// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {t} from '@i18n';

export const labels = {
    standard: {
        label: {
            id: t('post_priority.picker.label.standard'),
            defaultMessage: 'Standard',
        },
    },
    urgent: {
        label: {
            id: t('post_priority.picker.label.urgent'),
            defaultMessage: 'Urgent',
        },
    },
    important: {
        label: {
            id: t('post_priority.picker.label.important'),
            defaultMessage: 'Important',
        },
    },
    requestAck: {
        label: {
            id: t('post_priority.picker.label.request_ack'),
            defaultMessage: 'Request acknowledgement',
        },
        description: {
            id: t('post_priority.picker.label.request_ack.description'),
            defaultMessage: 'An acknowledgement button will appear with your message',
        },
    },
    persistentNotifications: {
        label: {
            id: t('post_priority.picker.label.persistent_notifications'),
            defaultMessage: 'Send persistent notifications',
        },
        description: {
            id: t('post_priority.picker.label.persistent_notifications.description'),
            defaultMessage: 'Recipients are notified every {interval, plural, one {minute} other {{interval} minutes}} until they acknowledge or reply.',
        },
    },
};

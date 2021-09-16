// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {t} from '@i18n';

export const CST = {
    DONT_CLEAR: {
        id: t('custom_status.expiry_dropdown.dont_clear'),
        defaultMessage: "Don't clear",
        value: '',
    },
    THIRTY_MINUTES: {
        id: t('custom_status.expiry_dropdown.thirty_minutes'),
        defaultMessage: '30 minutes',
        value: 'thirty_minutes',

    },
    ONE_HOUR: {
        id: t('custom_status.expiry_dropdown.one_hour'),
        defaultMessage: '1 hour',
        value: 'one_hour',
    },
    FOUR_HOURS: {
        id: t('custom_status.expiry_dropdown.four_hours'),
        defaultMessage: '4 hours',
        value: 'four_hours',
    },
    TODAY: {
        id: t('custom_status.expiry_dropdown.today'),
        defaultMessage: 'Today',
        value: 'today',
    },
    THIS_WEEK: {
        id: t('custom_status.expiry_dropdown.this_week'),
        defaultMessage: 'This week',
        value: 'this_week',
    },
    DATE_AND_TIME: {
        id: t('custom_status.expiry_dropdown.date_and_time'),
        defaultMessage: 'Date and Time',
        value: 'date_and_time',
    },
};

export const enum CustomStatusDuration {
    DONT_CLEAR = 'DONT_CLEAR',
    THIRTY_MINUTES = 'THIRTY_MINUTES',
    ONE_HOUR = 'ONE_HOUR',
    FOUR_HOURS = 'FOUR_HOURS',
    TODAY = 'TODAY',
    THIS_WEEK = 'THIS_WEEK',
    DATE_AND_TIME = 'DATE_AND_TIME',
}

export const CUSTOM_STATUS_TEXT_CHARACTER_LIMIT = 100;
export const SET_CUSTOM_STATUS_FAILURE = 'set_custom_status_failure';


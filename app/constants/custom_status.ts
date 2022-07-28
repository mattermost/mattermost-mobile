// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {t} from '@i18n';

export enum CustomStatusDurationEnum {
    DONT_CLEAR = '',
    THIRTY_MINUTES = 'thirty_minutes',
    ONE_HOUR = 'one_hour',
    FOUR_HOURS = 'four_hours',
    TODAY = 'today',
    THIS_WEEK = 'this_week',
    DATE_AND_TIME = 'date_and_time',
}

const {
    DONT_CLEAR,
    THIRTY_MINUTES,
    ONE_HOUR,
    FOUR_HOURS,
    TODAY,
    THIS_WEEK,
    DATE_AND_TIME,
} = CustomStatusDurationEnum;

export const CST: {[key in CustomStatusDuration]: {id: string; defaultMessage: string}} = {
    [DONT_CLEAR]: {
        id: t('custom_status.expiry_dropdown.dont_clear'),
        defaultMessage: "Don't clear",
    },
    [THIRTY_MINUTES]: {
        id: t('custom_status.expiry_dropdown.thirty_minutes'),
        defaultMessage: '30 minutes',
    },
    [ONE_HOUR]: {
        id: t('custom_status.expiry_dropdown.one_hour'),
        defaultMessage: '1 hour',
    },
    [FOUR_HOURS]: {
        id: t('custom_status.expiry_dropdown.four_hours'),
        defaultMessage: '4 hours',
    },
    [TODAY]: {
        id: t('custom_status.expiry_dropdown.today'),
        defaultMessage: 'Today',
    },
    [THIS_WEEK]: {
        id: t('custom_status.expiry_dropdown.this_week'),
        defaultMessage: 'This week',
    },
    [DATE_AND_TIME]: {
        id: t('custom_status.expiry_dropdown.date_and_time'),
        defaultMessage: 'Date and Time',
    },
};

export const CUSTOM_STATUS_TEXT_CHARACTER_LIMIT = 100;

export const SET_CUSTOM_STATUS_FAILURE = 'set_custom_status_failure';

export const CUSTOM_STATUS_TIME_PICKER_INTERVALS_IN_MINUTES = 30;

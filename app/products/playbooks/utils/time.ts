// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, type IntlShape} from 'react-intl';

import {toMilliseconds} from '@utils/datetime';

const messages = defineMessages({
    none: {
        id: 'playbooks.due_date.none',
        defaultMessage: 'None',
    },
    dateAtTime: {
        id: 'playbooks.due_date.date_at_time',
        defaultMessage: '{date} at {time}',
    },
});

export function getDueDateString(intl: IntlShape, dueDate: number | undefined, timezone: string, showAlwaysTime: boolean = false) {
    if (!dueDate) {
        return intl.formatMessage(messages.none);
    }
    const dateObject = new Date(dueDate);
    const dateString = dateObject.toLocaleDateString(intl.locale, {month: 'long', day: 'numeric', weekday: 'long'});
    if (showAlwaysTime || Math.abs(dueDate - Date.now()) < toMilliseconds({days: 1})) {
        const timeString = dateObject.toLocaleTimeString(intl.locale, {timeZone: timezone, hour: '2-digit', minute: '2-digit'});
        return intl.formatMessage(messages.dateAtTime, {date: dateString, time: timeString});
    }
    return dateString;
}

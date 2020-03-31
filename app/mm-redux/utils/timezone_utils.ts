// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {UserTimezone} from '@mm-redux/types/users';
export function getUserCurrentTimezone(userTimezone?: UserTimezone): string | undefined | null {
    if (!userTimezone) {
        return null;
    }
    const {
        useAutomaticTimezone,
        automaticTimezone,
        manualTimezone,
    } = userTimezone;

    let useAutomatic = useAutomaticTimezone;
    if (typeof useAutomaticTimezone === 'string') {
        useAutomatic = useAutomaticTimezone === 'true';
    }

    if (useAutomatic) {
        return automaticTimezone;
    }
    return manualTimezone;
}

export function getTimezoneRegion(timezone: string): string {
    if (timezone) {
        const split = timezone.split('/');
        if (split.length > 1) {
            return split.pop()!.replace(/_/g, ' ');
        }
    }

    return timezone;
}

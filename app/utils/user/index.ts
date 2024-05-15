// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import {Alert} from 'react-native';

import {General, Permissions, Preferences} from '@constants';
import {CustomStatusDurationEnum} from '@constants/custom_status';
import {DEFAULT_LOCALE, getLocalizedMessage, t} from '@i18n';
import {toTitleCase} from '@utils/helpers';

import type UserModel from '@typings/database/models/servers/user';
import type {IntlShape} from 'react-intl';

export function displayUsername(user?: UserProfile | UserModel | null, locale?: string, teammateDisplayNameSetting?: string, useFallbackUsername = true) {
    let name = useFallbackUsername ? getLocalizedMessage(locale || DEFAULT_LOCALE, t('channel_loader.someone'), 'Someone') : '';

    if (user) {
        if (teammateDisplayNameSetting === Preferences.DISPLAY_PREFER_NICKNAME) {
            name = user.nickname || getFullName(user);
        } else if (teammateDisplayNameSetting === Preferences.DISPLAY_PREFER_FULL_NAME) {
            name = getFullName(user);
        } else {
            name = user.username;
        }

        if (!name || name.trim().length === 0) {
            name = user.username;
        }
    }

    return name;
}

export function displayGroupMessageName(users: Array<UserProfile | UserModel>, locale?: string, teammateDisplayNameSetting?: string, excludeUserId?: string) {
    const names: string[] = [];
    const sortUsernames = (a: string, b: string) => {
        return a.localeCompare(b, locale || DEFAULT_LOCALE, {numeric: true});
    };

    users.forEach((u) => {
        if (u.id !== excludeUserId) {
            names.push(displayUsername(u, locale, teammateDisplayNameSetting, false) || u.username);
        }
    });

    return names.sort(sortUsernames).join(', ').trim();
}

export function getFullName(user: UserProfile | UserModel): string {
    let firstName: string;
    let lastName: string;

    if ('lastName' in user) {
        firstName = user.firstName;
        lastName = user.lastName;
    } else {
        firstName = user.first_name;
        lastName = user.last_name;
    }

    if (firstName && lastName) {
        return `${firstName} ${lastName}`;
    } else if (firstName) {
        return firstName;
    } else if (lastName) {
        return lastName;
    }

    return '';
}

export function getUserIdFromChannelName(knownUserId: string, channelName: string): string {
    const ids = channelName.split('__');
    if (ids[0] === knownUserId) {
        return ids[1];
    }
    return ids[0];
}

export function isRoleInRoles(roles: string, role: string): boolean {
    const rolesArray = roles.split(' ');
    return rolesArray.includes(role);
}

export function isGuest(roles: string): boolean {
    return isRoleInRoles(roles, Permissions.SYSTEM_GUEST_ROLE);
}

export function isSystemAdmin(roles: string): boolean {
    return isRoleInRoles(roles, Permissions.SYSTEM_ADMIN_ROLE);
}

export function isChannelAdmin(roles: string): boolean {
    return isRoleInRoles(roles, Permissions.CHANNEL_ADMIN_ROLE);
}

export const getUsersByUsername = (users: UserModel[]) => {
    const usersByUsername: Dictionary<UserModel> = {};

    for (const user of users) {
        usersByUsername[user.username] = user;
    }

    return usersByUsername;
};

export const getUserTimezoneProps = (currentUser?: UserModel) => {
    if (currentUser?.timezone) {
        return {
            ...currentUser?.timezone,
            useAutomaticTimezone: currentUser?.timezone?.useAutomaticTimezone === 'true',
        };
    }

    return {
        useAutomaticTimezone: true,
        automaticTimezone: '',
        manualTimezone: '',
    };
};

export const getUserTimezone = (user?: UserModel | UserProfile) => {
    return getTimezone(user?.timezone);
};

export const getTimezone = (timezone?: UserTimezone | null) => {
    if (!timezone) {
        return '';
    }

    const {useAutomaticTimezone} = timezone;
    let useAutomatic = useAutomaticTimezone;
    if (typeof useAutomaticTimezone === 'string') {
        useAutomatic = useAutomaticTimezone === 'true';
    }

    if (useAutomatic) {
        return timezone.automaticTimezone;
    }

    return timezone.manualTimezone;
};

export const getTimezoneRegion = (timezone: string): string => {
    if (timezone) {
        const split = timezone.split('/');
        if (split.length > 1) {
            return split.pop()!.replace(/_/g, ' ');
        }
    }

    return timezone;
};

export const getUserCustomStatus = (user?: UserModel | UserProfile): UserCustomStatus | undefined => {
    try {
        if (typeof user?.props?.customStatus === 'string') {
            return JSON.parse(user.props.customStatus);
        }

        return user?.props?.customStatus;
    } catch {
        return undefined;
    }
};

export function isCustomStatusExpired(user?: UserModel | UserProfile) {
    if (!user) {
        return true;
    }

    const customStatus = getUserCustomStatus(user);

    if (!customStatus) {
        return true;
    }

    if (customStatus.duration === CustomStatusDurationEnum.DONT_CLEAR || !customStatus.duration) {
        return false;
    }

    const expiryTime = moment(customStatus.expires_at);
    const timezone = getUserTimezone(user);
    const currentTime = timezone ? moment.tz(timezone) : moment();
    return currentTime.isSameOrAfter(expiryTime);
}

export function confirmOutOfOfficeDisabled(intl: IntlShape, status: string, updateStatus: (status: string) => void) {
    const userStatusId = 'modal.manual_status.auto_responder.message_' + status;
    t('modal.manual_status.auto_responder.message_');
    t('modal.manual_status.auto_responder.message_away');
    t('modal.manual_status.auto_responder.message_dnd');
    t('modal.manual_status.auto_responder.message_offline');
    t('modal.manual_status.auto_responder.message_online');

    let translatedStatus;
    if (status === 'dnd') {
        translatedStatus = intl.formatMessage({
            id: 'mobile.set_status.dnd',
            defaultMessage: 'Do Not Disturb',
        });
    } else {
        translatedStatus = intl.formatMessage({
            id: `mobile.set_status.${status}`,
            defaultMessage: toTitleCase(status),
        });
    }

    Alert.alert(
        intl.formatMessage({
            id: 'mobile.reset_status.title_ooo',
            defaultMessage: 'Disable "Out Of Office"?',
        }),
        intl.formatMessage({
            id: userStatusId,
            defaultMessage: 'Would you like to switch your status to "{status}" and disable Automatic Replies?',
        }, {status: translatedStatus}),
        [{
            text: intl.formatMessage({id: 'mobile.reset_status.alert_cancel', defaultMessage: 'Cancel'}),
            style: 'cancel',
        }, {
            text: intl.formatMessage({id: 'mobile.reset_status.alert_ok', defaultMessage: 'OK'}),
            onPress: () => updateStatus(status),
        }],
    );
}

export function isBot(user: UserProfile | UserModel): boolean {
    return 'isBot' in user ? Boolean(user.isBot) : Boolean(user.is_bot);
}

export function isShared(user: UserProfile | UserModel): boolean {
    return ('remoteId' in user) ? Boolean(user.remoteId) : Boolean(user.remote_id);
}

export function isDeactivated(user: UserProfile | UserModel): boolean {
    return Boolean('deleteAt' in user ? user.deleteAt : user.delete_at);
}

export function removeUserFromList(userId: string, originalList: UserProfile[]): UserProfile[] {
    const list = [...originalList];
    for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].id === userId) {
            list.splice(i, 1);
            return list;
        }
    }

    return list;
}

// Splits the term by a splitStr and composes a list of the parts of
// the split concatenated with the rest, forming a set of suggesitons
// matchable with startsWith
//
// E.g.: for "one.two.three" by "." it would yield
// ["one.two.three", ".two.three", "two.three", ".three", "three"]
export function getSuggestionsSplitBy(term: string, splitStr: string): string[] {
    const splitTerm = term.split(splitStr);
    const initialSuggestions = splitTerm.map((st, i) => splitTerm.slice(i).join(splitStr));
    let suggestions: string[] = [];

    if (splitStr === ' ') {
        suggestions = initialSuggestions;
    } else {
        suggestions = initialSuggestions.reduce<string[]>((acc, val) => {
            if (acc.length === 0) {
                acc.push(val);
            } else {
                acc.push(splitStr + val, val);
            }
            return acc;
        }, []);
    }
    return suggestions;
}

export function getSuggestionsSplitByMultiple(term: string, splitStrs: string[]): string[] {
    const suggestions = splitStrs.reduce((acc, val) => {
        getSuggestionsSplitBy(term, val).forEach((suggestion) => acc.add(suggestion));
        return acc;
    }, new Set<string>());

    return [...suggestions];
}

export function filterProfilesMatchingTerm(users: UserProfile[], term: string): UserProfile[] {
    const lowercasedTerm = term.toLowerCase();
    let trimmedTerm = lowercasedTerm;
    if (trimmedTerm.startsWith('@')) {
        trimmedTerm = trimmedTerm.substring(1);
    }

    return users.filter((user: UserProfile) => {
        if (!user) {
            return false;
        }

        const profileSuggestions: string[] = [];
        const usernameSuggestions = getSuggestionsSplitByMultiple((user.username || '').toLowerCase(), General.AUTOCOMPLETE_SPLIT_CHARACTERS);
        profileSuggestions.push(...usernameSuggestions);
        const first = (user.first_name || '').toLowerCase();
        const last = (user.last_name || '').toLowerCase();
        const full = first + ' ' + last;
        profileSuggestions.push(first, last, full);
        profileSuggestions.push((user.nickname || '').toLowerCase());
        const email = (user.email || '').toLowerCase();
        profileSuggestions.push(email);
        profileSuggestions.push((user.nickname || '').toLowerCase());

        const split = email.split('@');
        if (split.length > 1) {
            profileSuggestions.push(split[1]);
        }

        return profileSuggestions.
            filter((suggestion) => suggestion !== '').
            some((suggestion) => suggestion.includes(trimmedTerm));
    });
}

export function getNotificationProps(user?: UserModel) {
    if (user && user.notifyProps) {
        return user.notifyProps;
    }

    const props: UserNotifyProps = {
        channel: 'true',
        comments: 'any',
        desktop: 'all',
        desktop_sound: 'true',
        email: 'true',
        first_name: (!user || !user.firstName) ? 'false' : 'true',
        mark_unread: 'all',
        mention_keys: user ? `${user.username},@${user.username}` : '',
        highlight_keys: '',
        push: 'mention',
        push_status: 'online',
        push_threads: 'all',
        email_threads: 'all',
    };

    return props;
}

export function getEmailInterval(enableEmailNotification: boolean, enableEmailBatching: boolean, emailIntervalPreference: number): number {
    const {
        INTERVAL_NEVER,
        INTERVAL_IMMEDIATE,
        INTERVAL_FIFTEEN_MINUTES,
        INTERVAL_HOUR,
    } = Preferences;

    const validValuesWithEmailBatching = [INTERVAL_IMMEDIATE, INTERVAL_NEVER, INTERVAL_FIFTEEN_MINUTES, INTERVAL_HOUR];
    const validValuesWithoutEmailBatching = [INTERVAL_IMMEDIATE, INTERVAL_NEVER];

    if (!enableEmailNotification) {
        return INTERVAL_NEVER;
    } else if (enableEmailBatching && validValuesWithEmailBatching.indexOf(emailIntervalPreference) === -1) {
        // When email batching is enabled, the default interval is 15 minutes
        return INTERVAL_FIFTEEN_MINUTES;
    } else if (!enableEmailBatching && validValuesWithoutEmailBatching.indexOf(emailIntervalPreference) === -1) {
        // When email batching is not enabled, the default interval is immediately
        return INTERVAL_IMMEDIATE;
    } else if (enableEmailNotification && emailIntervalPreference === INTERVAL_NEVER) {
        // When email notification is enabled, the default interval is immediately
        return INTERVAL_IMMEDIATE;
    }

    return emailIntervalPreference;
}

export const getEmailIntervalTexts = (interval: string) => {
    const intervalTexts: Record<string, any> = {
        [Preferences.INTERVAL_FIFTEEN_MINUTES]: {id: 'notification_settings.email.fifteenMinutes', defaultMessage: 'Every 15 minutes'},
        [Preferences.INTERVAL_HOUR]: {id: 'notification_settings.email.everyHour', defaultMessage: 'Every hour'},
        [Preferences.INTERVAL_IMMEDIATE]: {id: 'notification_settings.email.immediately', defaultMessage: 'Immediately'},
        [Preferences.INTERVAL_NEVER]: {id: 'notification_settings.email.never', defaultMessage: 'Never'},
    };
    return intervalTexts[interval];
};

export const getLastPictureUpdate = (user: UserModel | UserProfile) => {
    if ('isBot' in user) {
        return user.isBot ? user.props?.bot_last_icon_update : user.lastPictureUpdate || 0;
    }

    return user.is_bot ? user.bot_last_icon_update : user.last_picture_update || 0;
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import {Alert} from 'react-native';

import {General, Permissions, Preferences} from '@constants';
import {CustomStatusDuration} from '@constants/custom_status';
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

export const getUsersByUsername = (users: UserModel[]) => {
    const usersByUsername: Dictionary<UserModel> = {};

    for (const user of users) {
        usersByUsername[user.username] = user;
    }

    return usersByUsername;
};

export const getUserTimezone = (user: UserModel) => {
    return getTimezone(user.timezone);
};

export const getTimezone = (timezone: UserTimezone | null) => {
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

export function isCustomStatusExpired(user?: UserModel) {
    if (!user) {
        return true;
    }

    const customStatus = getUserCustomStatus(user);

    if (!customStatus) {
        return true;
    }

    if (customStatus.duration === CustomStatusDuration.DONT_CLEAR || !customStatus.duration) {
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
    return 'is_bot' in user ? Boolean(user.is_bot) : Boolean(user.isBot);
}

export function isShared(user: UserProfile | UserModel): boolean {
    return ('remoteId' in user) ? Boolean(user.remoteId) : Boolean(user.remote_id);
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
            some((suggestion) => suggestion.startsWith(trimmedTerm));
    });
}

export function getNotificationProps(user: UserModel) {
    if (user && user.notifyProps) {
        return user.notifyProps;
    }

    const props: Partial<UserNotifyProps> = {
        channel: 'true',
        comments: 'any',
        desktop: 'all',
        desktop_sound: 'true',
        first_name: (!user || !user.firstName) ? 'false' : 'true',
        mention_keys: user ? `${user.username},@${user.username}` : '',
        push: 'mention',
        push_status: 'online',
    };

    return props;
}

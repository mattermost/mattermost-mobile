// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';

import {General, Preferences} from '@constants';
import {UserModel} from '@database/models/server';
import {DEFAULT_LOCALE, getLocalizedMessage, t} from '@i18n';

import type GroupModel from '@typings/database/models/servers/group';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type {UserMentionKey} from '@typings/global/markdown';

export function displayUsername(user?: UserProfile | UserModel, locale?: string, teammateDisplayNameSetting?: string, useFallbackUsername = true) {
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

export function displayGroupMessageName(users: UserProfile[], locale?: string, teammateDisplayNameSetting?: string, excludeUserId?: string) {
    const names: string[] = [];
    const sortUsernames = (a: string, b: string) => {
        return a.localeCompare(b, locale || DEFAULT_LOCALE, {numeric: true});
    };

    users.forEach((u) => {
        if (u.id !== excludeUserId) {
            names.push(displayUsername(u, locale, teammateDisplayNameSetting));
        }
    });

    return names.sort(sortUsernames).join(', ');
}

export function getFullName(user: UserProfile | UserModel): string {
    let firstName: string;
    let lastName: string;

    if (user instanceof UserModel) {
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
    return isRoleInRoles(roles, General.SYSTEM_GUEST_ROLE);
}

export function isSystemAdmin(roles: string): boolean {
    return isRoleInRoles(roles, General.SYSTEM_ADMIN_ROLE);
}

export const getUsersByUsername = (users: UserModel[]) => {
    const usersByUsername: Dictionary<UserModel> = {};

    for (const user of users) {
        usersByUsername[user.username] = user;
    }

    return usersByUsername;
};

export const getUserMentionKeys = (user: UserModel, groups: GroupModel[], userGroups: GroupMembershipModel[]) => {
    const keys: UserMentionKey[] = [];

    if (!user.notifyProps) {
        return keys;
    }

    if (user.notifyProps.mention_keys) {
        const mentions = user.notifyProps.mention_keys.split(',').map((key) => ({key}));
        keys.push(...mentions);
    }

    if (user.notifyProps.first_name === 'true' && user.firstName) {
        keys.push({key: user.firstName, caseSensitive: true});
    }

    if (user.notifyProps.channel === 'true') {
        keys.push(
            {key: '@channel'},
            {key: '@all'},
            {key: '@here'},
        );
    }

    const usernameKey = `@${user.username}`;
    if (keys.findIndex((item) => item.key === usernameKey) === -1) {
        keys.push({key: usernameKey});
    }

    if (groups.length && userGroups.length) {
        const groupMentions = userGroups.reduce((result: Array<{key: string}>, ug: GroupMembershipModel) => {
            const group = groups.find((g) => ug.groupId === g.id);
            if (group) {
                result.push({key: `@${group.name}`});
            }
            return result;
        }, []);

        keys.push(...groupMentions);
    }

    return keys;
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

export const getUserCustomStatus = (user: UserModel) => {
    if (user.props?.customStatus) {
        return user.props.customStatus as UserCustomStatus;
    }

    return undefined;
};

export function isCustomStatusExpired(user: UserModel) {
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

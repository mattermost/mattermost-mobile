// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {Alert} from 'react-native';

import {Preferences} from '@constants';
import {Ringtone} from '@constants/calls';

import {
    confirmOutOfOfficeDisabled,
    displayGroupMessageName,
    displayUsername,
    filterProfilesMatchingTerm,
    getEmailInterval,
    getEmailIntervalTexts,
    getFullName,
    getLastPictureUpdate,
    getNotificationProps,
    getSuggestionsSplitBy,
    getSuggestionsSplitByMultiple,
    getTimezone,
    getTimezoneRegion,
    getUserCustomStatus,
    getUserIdFromChannelName,
    getUsersByUsername,
    getUserTimezone,
    getUserTimezoneProps,
    isBot,
    isChannelAdmin,
    isCustomStatusExpired,
    isDeactivated,
    isGuest,
    isRoleInRoles,
    isShared,
    isSystemAdmin,
    removeUserFromList,
} from './index';

import type {UserModel} from '@database/models/server';
import type {IntlShape} from 'react-intl';

describe('displayUsername', () => {
    const user = {
        username: 'johndoe',
        first_name: 'John',
        last_name: 'Doe',
        nickname: 'Johnny',
    } as UserProfile;

    it('should return the nickname if teammateDisplayNameSetting is DISPLAY_PREFER_NICKNAME', () => {
        const result = displayUsername(user, 'en', Preferences.DISPLAY_PREFER_NICKNAME);
        expect(result).toBe('Johnny');
    });

    it('should return the full name if teammateDisplayNameSetting is DISPLAY_PREFER_FULL_NAME', () => {
        const result = displayUsername(user, 'en', Preferences.DISPLAY_PREFER_FULL_NAME);
        expect(result).toBe('John Doe');
    });

    it('should return the username if teammateDisplayNameSetting is DISPLAY_PREFER_USERNAME', () => {
        const result = displayUsername(user, 'en', Preferences.DISPLAY_PREFER_USERNAME);
        expect(result).toBe('johndoe');
    });

    it('should return the username if no teammateDisplayNameSetting is provided', () => {
        const result = displayUsername(user, 'en');
        expect(result).toBe('johndoe');
    });

    it('should return "Someone" if user is not provided and useFallbackUsername is true', () => {
        const result = displayUsername(undefined, 'en', Preferences.DISPLAY_PREFER_USERNAME, true);
        expect(result).toBe('Someone');
    });

    it('should return an empty string if user is not provided and useFallbackUsername is false', () => {
        const result = displayUsername(undefined, 'en', Preferences.DISPLAY_PREFER_USERNAME, false);
        expect(result).toBe('');
    });

    it('should return the username if nickname and full name are not available', () => {
        const userWithoutNicknameAndFullName = {
            username: 'johndoe',
            first_name: '',
            last_name: '',
            nickname: '',
        } as UserProfile;
        const result = displayUsername(userWithoutNicknameAndFullName, 'en', Preferences.DISPLAY_PREFER_NICKNAME);
        expect(result).toBe('johndoe');
    });

    it('should return the username if name is empty or whitespace', () => {
        const userWithEmptyName = {
            username: 'johndoe',
            first_name: '',
            last_name: '',
            nickname: '',
        } as UserProfile;
        const result = displayUsername(userWithEmptyName, 'en', Preferences.DISPLAY_PREFER_FULL_NAME);
        expect(result).toBe('johndoe');
    });
});

describe('displayGroupMessageName', () => {
    const user1 = {id: 'user1', username: 'john_doe', first_name: 'John', last_name: 'Doe'} as UserProfile;
    const user2 = {id: 'user2', username: 'jane_doe', first_name: 'Jane', last_name: 'Doe'} as UserProfile;
    const user3 = {id: 'user3', username: 'alice_smith', first_name: 'Alice', last_name: 'Smith'} as UserProfile;

    it('should return a comma-separated list of usernames', () => {
        const users = [user1, user2, user3];
        const result = displayGroupMessageName(users);
        expect(result).toBe('alice_smith, jane_doe, john_doe');
    });

    it('should exclude the user with the specified ID', () => {
        const users = [user1, user2, user3];
        const result = displayGroupMessageName(users, undefined, undefined, 'user2');
        expect(result).toBe('alice_smith, john_doe');
    });

    it('should use the full name if teammateDisplayNameSetting is DISPLAY_PREFER_FULL_NAME', () => {
        const users = [user1, user2, user3];
        const result = displayGroupMessageName(users, undefined, Preferences.DISPLAY_PREFER_FULL_NAME);
        expect(result).toBe('Alice Smith, Jane Doe, John Doe');
    });

    it('should use the nickname if teammateDisplayNameSetting is DISPLAY_PREFER_NICKNAME', () => {
        const userWithNickname = {...user1, nickname: 'Johnny'};
        const users = [userWithNickname, user2, user3];
        const result = displayGroupMessageName(users, undefined, Preferences.DISPLAY_PREFER_NICKNAME);
        expect(result).toBe('Alice Smith, Jane Doe, Johnny');
    });

    it('should fallback to username if full name or nickname is not available', () => {
        const userWithEmptyName = {id: 'user4', username: 'empty_name', first_name: '', last_name: ''} as UserProfile;
        const users = [userWithEmptyName, user2, user3];
        const result = displayGroupMessageName(users, undefined, Preferences.DISPLAY_PREFER_FULL_NAME);
        expect(result).toBe('Alice Smith, empty_name, Jane Doe');
    });

    it('should handle empty user list', () => {
        const users: UserProfile[] = [];
        const result = displayGroupMessageName(users);
        expect(result).toBe('');
    });
});

describe('getFullName', () => {
    it('should return the full name if both first and last names are provided - UserProfile', () => {
        const user = {first_name: 'John', last_name: 'Doe'} as UserProfile;
        const result = getFullName(user);
        expect(result).toBe('John Doe');
    });

    it('should return the full name if both first and last names are provided - UserModel', () => {
        const user = {firstName: 'John', lastName: 'Doe'} as UserModel;
        const result = getFullName(user);
        expect(result).toBe('John Doe');
    });

    it('should return the first name if only the first name is provided', () => {
        const user = {first_name: 'John', last_name: ''} as UserProfile;
        const result = getFullName(user);
        expect(result).toBe('John');
    });

    it('should return the last name if only the last name is provided', () => {
        const user = {first_name: '', last_name: 'Doe'} as UserProfile;
        const result = getFullName(user);
        expect(result).toBe('Doe');
    });

    it('should return an empty string if neither first nor last name is provided', () => {
        const user = {first_name: '', last_name: ''} as UserProfile;
        const result = getFullName(user);
        expect(result).toBe('');
    });
});

describe('getUserIdFromChannelName', () => {
    it('should return the other user ID from the channel name', () => {
        const knownUserId = 'user1';
        const channelName = 'user1__user2';
        const result = getUserIdFromChannelName(knownUserId, channelName);
        expect(result).toBe('user2');
    });

    it('should return the other user ID from the channel name when the known user ID is second', () => {
        const knownUserId = 'user2';
        const channelName = 'user1__user2';
        const result = getUserIdFromChannelName(knownUserId, channelName);
        expect(result).toBe('user1');
    });
});

describe('isRoleInRoles', () => {
    it('should return true if the role is in the roles string', () => {
        const roles = 'system_admin system_user';
        const role = 'system_admin';
        const result = isRoleInRoles(roles, role);
        expect(result).toBe(true);
    });

    it('should return false if the role is not in the roles string', () => {
        const roles = 'system_user';
        const role = 'system_admin';
        const result = isRoleInRoles(roles, role);
        expect(result).toBe(false);
    });
});

describe('isGuest', () => {
    it('should return true if the user is a guest', () => {
        const roles = 'system_guest';
        const result = isGuest(roles);
        expect(result).toBe(true);
    });

    it('should return false if the user is not a guest', () => {
        const roles = 'system_user';
        const result = isGuest(roles);
        expect(result).toBe(false);
    });
});

describe('isSystemAdmin', () => {
    it('should return true if the user is a system admin', () => {
        const roles = 'system_admin';
        const result = isSystemAdmin(roles);
        expect(result).toBe(true);
    });

    it('should return false if the user is not a system admin', () => {
        const roles = 'system_user';
        const result = isSystemAdmin(roles);
        expect(result).toBe(false);
    });
});

describe('isChannelAdmin', () => {
    it('should return true if the user is a channel admin', () => {
        const roles = 'channel_admin';
        const result = isChannelAdmin(roles);
        expect(result).toBe(true);
    });

    it('should return false if the user is not a channel admin', () => {
        const roles = 'system_user';
        const result = isChannelAdmin(roles);
        expect(result).toBe(false);
    });
});

describe('getUsersByUsername', () => {
    it('should return a dictionary of users by username', () => {
        const users = [
            {username: 'john_doe'} as UserModel,
            {username: 'jane_doe'} as UserModel,
        ];
        const result = getUsersByUsername(users);
        expect(result).toEqual({
            john_doe: users[0],
            jane_doe: users[1],
        });
    });
});

describe('getUserTimezoneProps', () => {
    it('should return the user timezone props if they exist', () => {
        const user = {timezone: {useAutomaticTimezone: 'true', automaticTimezone: 'America/New_York', manualTimezone: 'America/Los_Angeles'}} as UserModel;
        const result = getUserTimezoneProps(user);
        expect(result).toEqual({
            useAutomaticTimezone: true,
            automaticTimezone: 'America/New_York',
            manualTimezone: 'America/Los_Angeles',
        });
    });

    it('should return default timezone props if they do not exist', () => {
        const user = {} as UserModel;
        const result = getUserTimezoneProps(user);
        expect(result).toEqual({
            useAutomaticTimezone: true,
            automaticTimezone: '',
            manualTimezone: '',
        });
    });
});

describe('getUserTimezone', () => {
    it('should return the user timezone', () => {
        const user = {timezone: {useAutomaticTimezone: 'true', automaticTimezone: 'America/New_York', manualTimezone: 'America/Los_Angeles'}} as UserModel;
        const result = getUserTimezone(user);
        expect(result).toBe('America/New_York');
    });

    it('should return an empty string if the user timezone does not exist', () => {
        const user = {} as UserModel;
        const result = getUserTimezone(user);
        expect(result).toBe('');
    });
});

describe('getTimezone', () => {
    it('should return the automatic timezone if useAutomaticTimezone is true', () => {
        const timezone = {useAutomaticTimezone: 'true', automaticTimezone: 'America/New_York', manualTimezone: 'America/Los_Angeles'} as UserTimezone;
        const result = getTimezone(timezone);
        expect(result).toBe('America/New_York');
    });

    it('should return the manual timezone if useAutomaticTimezone is false', () => {
        const timezone = {useAutomaticTimezone: 'false', automaticTimezone: 'America/New_York', manualTimezone: 'America/Los_Angeles'} as UserTimezone;
        const result = getTimezone(timezone);
        expect(result).toBe('America/Los_Angeles');
    });

    it('should return an empty string if the timezone does not exist', () => {
        const result = getTimezone(null);
        expect(result).toBe('');
    });
});

describe('getTimezoneRegion', () => {
    it('should return the region of the timezone', () => {
        const timezone = 'America/New_York';
        const result = getTimezoneRegion(timezone);
        expect(result).toBe('New York');
    });

    it('should return the timezone if it does not contain a region', () => {
        const timezone = 'UTC';
        const result = getTimezoneRegion(timezone);
        expect(result).toBe('UTC');
    });
});

describe('getUserCustomStatus', () => {
    it('should return the custom status if it exists', () => {
        const user = {
            username: 'johndoe',
            props: {customStatus: '{"emoji": "smile", "text": "Happy", "duration": "today", "expires_at": "2023-12-31T23:59:59Z"}'} as UserProps,
        } as UserProfile;
        const result = getUserCustomStatus(user);
        expect(result).toEqual({
            emoji: 'smile',
            text: 'Happy',
            duration: 'today',
            expires_at: '2023-12-31T23:59:59Z',
        });
    });

    it('should return undefined if the custom status does not exist', () => {
        const user = {} as UserModel;
        const result = getUserCustomStatus(user);
        expect(result).toBeUndefined();
    });
});

describe('isCustomStatusExpired', () => {
    it('should return true if the custom status is expired', () => {
        const user = {username: 'john_doe',
            props: {customStatus: '{"emoji": "smile", "text": "Happy", "duration": "today", "expires_at": "2020-12-31T23:59:59Z"}'} as UserProps,
        } as UserProfile;
        const result = isCustomStatusExpired(user);
        expect(result).toBe(true);
    });

    it('should return false if the custom status is not expired', () => {
        const user = {username: 'john_doe',
            props: {customStatus: '{"emoji": "smile", "text": "Happy", "duration": "today", "expires_at": "2099-12-31T23:59:59Z"}'} as UserProps,
        } as UserProfile;
        const result = isCustomStatusExpired(user);
        expect(result).toBe(false);
    });

    it('should return true if the custom status does not exist', () => {
        const user = {} as UserModel;
        const result = isCustomStatusExpired(user);
        expect(result).toBe(true);
    });
});

describe('isBot', () => {
    it('should return true if the user is a bot', () => {
        const user = {isBot: true} as UserModel;
        const result = isBot(user);
        expect(result).toBe(true);
    });

    it('should return false if the user is not a bot', () => {
        const user = {isBot: false} as UserModel;
        const result = isBot(user);
        expect(result).toBe(false);
    });
});

describe('isShared', () => {
    it('should return true if the user is shared', () => {
        const user = {remoteId: 'remote_id'} as UserModel;
        const result = isShared(user);
        expect(result).toBe(true);
    });

    it('should return false if the user is not shared', () => {
        const user = {remoteId: ''} as UserModel;
        const result = isShared(user);
        expect(result).toBe(false);
    });
});

describe('getSuggestionsSplitBy', () => {
    it('should split the term by the given split string and return suggestions', () => {
        const term = 'one.two.three';
        const splitStr = '.';
        const result = getSuggestionsSplitBy(term, splitStr);
        expect(result).toEqual(['one.two.three', '.two.three', 'two.three', '.three', 'three']);
    });

    it('should handle splitting by space', () => {
        const term = 'one two three';
        const splitStr = ' ';
        const result = getSuggestionsSplitBy(term, splitStr);
        expect(result).toEqual(['one two three', 'two three', 'three']);
    });
});

describe('getSuggestionsSplitByMultiple', () => {
    it('should split the term by multiple split strings and return suggestions', () => {
        const term = 'one.two three';
        const splitStrs = ['.', ' '];
        const result = getSuggestionsSplitByMultiple(term, splitStrs);
        const expected = ['.two three', 'three', 'one.two three', 'two three'].sort();
        expect(result.sort()).toEqual(expected);
    });
});

describe('filterProfilesMatchingTerm', () => {
    const users = [
        {username: 'john_doe', first_name: 'John', last_name: 'Doe', nickname: 'Johnny', email: 'john@example.com'} as UserProfile,
        {username: 'jane_doe', first_name: 'Jane', last_name: 'Doe', nickname: 'Janey', email: 'jane@example.com'} as UserProfile,
    ];

    it('should filter users matching the term', () => {
        const term = 'john';
        const result = filterProfilesMatchingTerm(users, term);
        expect(result).toEqual([users[0]]);
    });

    it('should filter users matching the term with @ prefix', () => {
        const term = '@john';
        const result = filterProfilesMatchingTerm(users, term);
        expect(result).toEqual([users[0]]);
    });

    it('should filter users matching the term in email', () => {
        const term = 'example.com';
        const result = filterProfilesMatchingTerm(users, term);
        expect(result).toEqual(users);
    });

    it('should return an empty array if no users match the term', () => {
        const term = 'nonexistent';
        const result = filterProfilesMatchingTerm(users, term);
        expect(result).toEqual([]);
    });
});

describe('getNotificationProps', () => {
    it('should return the user notification props if they exist', () => {
        const user = {notifyProps: {channel: 'false', comments: 'never'}} as UserModel;
        const result = getNotificationProps(user);
        expect(result).toEqual(user.notifyProps);
    });

    it('should return default notification props if they do not exist', () => {
        const user = {} as UserModel;
        const result = getNotificationProps(user);
        expect(result).toEqual({
            channel: 'true',
            comments: 'any',
            desktop: 'all',
            desktop_sound: 'true',
            email: 'true',
            first_name: 'false',
            mark_unread: 'all',
            mention_keys: '',
            highlight_keys: '',
            push: 'mention',
            push_status: 'online',
            push_threads: 'all',
            email_threads: 'all',
            calls_desktop_sound: 'true',
            calls_notification_sound: Ringtone.Calm,
            calls_mobile_sound: '',
            calls_mobile_notification_sound: '',
        });
    });
});

describe('getEmailInterval', () => {
    it('should return INTERVAL_NEVER if email notifications are disabled', () => {
        const result = getEmailInterval(false, true, Preferences.INTERVAL_IMMEDIATE);
        expect(result).toBe(Preferences.INTERVAL_NEVER);
    });

    it('should return INTERVAL_FIFTEEN_MINUTES if email batching is enabled and interval is invalid', () => {
        const result = getEmailInterval(true, true, 999);
        expect(result).toBe(Preferences.INTERVAL_FIFTEEN_MINUTES);
    });

    it('should return INTERVAL_IMMEDIATE if email batching is disabled and interval is invalid', () => {
        const result = getEmailInterval(true, false, 999);
        expect(result).toBe(Preferences.INTERVAL_IMMEDIATE);
    });

    it('should return the provided interval if it is valid', () => {
        const result = getEmailInterval(true, true, Preferences.INTERVAL_HOUR);
        expect(result).toBe(Preferences.INTERVAL_HOUR);
    });
});

describe('getEmailIntervalTexts', () => {
    it('should return the correct text for each interval', () => {
        expect(getEmailIntervalTexts(`${Preferences.INTERVAL_FIFTEEN_MINUTES}`)).toEqual({id: 'notification_settings.email.fifteenMinutes', defaultMessage: 'Every 15 minutes'});
        expect(getEmailIntervalTexts(`${Preferences.INTERVAL_HOUR}`)).toEqual({id: 'notification_settings.email.everyHour', defaultMessage: 'Every hour'});
        expect(getEmailIntervalTexts(`${Preferences.INTERVAL_IMMEDIATE}`)).toEqual({id: 'notification_settings.email.immediately', defaultMessage: 'Immediately'});
        expect(getEmailIntervalTexts(`${Preferences.INTERVAL_NEVER}`)).toEqual({id: 'notification_settings.email.never', defaultMessage: 'Never'});
    });
});

describe('getLastPictureUpdate', () => {
    it('should return bot_last_icon_update if the user is a bot', () => {
        const user = {isBot: true, props: {bot_last_icon_update: 12345} as UserProps} as UserModel;
        const result = getLastPictureUpdate(user);
        expect(result).toBe(12345);
    });

    it('should return lastPictureUpdate if the user is not a bot', () => {
        const user = {isBot: false, lastPictureUpdate: 67890} as UserModel;
        const result = getLastPictureUpdate(user);
        expect(result).toBe(67890);
    });

    it('should return 0 if lastPictureUpdate is not available', () => {
        const user = {isBot: false} as UserModel;
        const result = getLastPictureUpdate(user);
        expect(result).toBe(0);
    });
});

describe('isDeactivated', () => {
    it('should return true if the user is deactivated', () => {
        const user = {delete_at: 12345} as UserProfile;
        const result = isDeactivated(user);
        expect(result).toBe(true);
    });

    it('should return false if the user is not deactivated', () => {
        const user = {delete_at: 0} as UserProfile;
        const result = isDeactivated(user);
        expect(result).toBe(false);
    });

    it('should return true if the user is deactivated using deleteAt', () => {
        const user = {deleteAt: 12345} as UserModel;
        const result = isDeactivated(user);
        expect(result).toBe(true);
    });

    it('should return false if the user is not deactivated using deleteAt', () => {
        const user = {deleteAt: 0} as UserModel;
        const result = isDeactivated(user);
        expect(result).toBe(false);
    });
});

describe('removeUserFromList', () => {
    const user1 = {id: 'user1'} as UserProfile;
    const user2 = {id: 'user2'} as UserProfile;
    const user3 = {id: 'user3'} as UserProfile;

    it('should remove the user from the list', () => {
        const originalList = [user1, user2, user3];
        const result = removeUserFromList('user2', originalList);
        expect(result).toEqual([user1, user3]);
    });

    it('should return the original list if the user is not found', () => {
        const originalList = [user1, user2, user3];
        const result = removeUserFromList('user4', originalList);
        expect(result).toEqual(originalList);
    });

    it('should return an empty list if the original list is empty', () => {
        const originalList: UserProfile[] = [];
        const result = removeUserFromList('user1', originalList);
        expect(result).toEqual([]);
    });
});

describe('confirmOutOfOfficeDisabled', () => {
    const intl = {
        formatMessage: jest.fn(({defaultMessage}, values) => {
            if (values) {
                return defaultMessage.replace('{status}', values.status);
            }
            return defaultMessage;
        }),
    } as unknown as IntlShape;

    const updateStatus = jest.fn();

    const alert = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(alert);
    });

    it('should show an alert with the correct messages for dnd status', () => {
        confirmOutOfOfficeDisabled(intl, 'dnd', updateStatus);

        expect(intl.formatMessage).toHaveBeenCalledWith({
            id: 'mobile.set_status.dnd',
            defaultMessage: 'Do Not Disturb',
        });

        expect(alert).toHaveBeenCalledWith(
            'Disable "Out Of Office"?',
            'Would you like to switch your status to "Do Not Disturb" and disable Automatic Replies?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'OK',
                    onPress: expect.any(Function),
                },
            ],
        );
    });

    it('should show an alert with the correct messages for other statuses', () => {
        confirmOutOfOfficeDisabled(intl, 'away', updateStatus);

        expect(intl.formatMessage).toHaveBeenCalledWith({
            id: 'mobile.set_status.away',
            defaultMessage: 'Away',
        });

        expect(alert).toHaveBeenCalledWith(
            'Disable "Out Of Office"?',
            'Would you like to switch your status to "Away" and disable Automatic Replies?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'OK',
                    onPress: expect.any(Function),
                },
            ],
        );
    });

    it('should call updateStatus with the correct status when OK is pressed', () => {
        confirmOutOfOfficeDisabled(intl, 'online', updateStatus);

        const okButton = (Alert.alert as jest.Mock).mock.calls[0][2][1];
        okButton.onPress();

        expect(updateStatus).toHaveBeenCalledWith('online');
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';

import {General} from '@constants';
import {PostPriorityType} from '@constants/post';

import {usePersistentNotificationProps} from './persistent_notification_props';

describe('usePersistentNotificationProps', () => {
    const baseProps = {
        value: '',
        channelType: 'O' as ChannelType,
        postPriority: {
            priority: PostPriorityType.URGENT,
            persistent_notifications: true,
        },
    };

    it('should initialize with default values', () => {
        const {result} = renderHook(() => usePersistentNotificationProps(baseProps));

        expect(result.current.persistentNotificationsEnabled).toBe(true);
        expect(result.current.noMentionsError).toBe(true);
        expect(result.current.mentionsList).toEqual([]);
    });

    it('should detect mentions in message', () => {
        const props = {
            ...baseProps,
            value: 'Hello @user1 and @user2',
        };

        const {result} = renderHook(() => usePersistentNotificationProps(props));

        expect(result.current.persistentNotificationsEnabled).toBe(true);
        expect(result.current.noMentionsError).toBe(false);
        expect(result.current.mentionsList).toEqual(['@user1', '@user2']);
    });

    it('should disable persistent notifications for DM channels', () => {
        const props = {
            ...baseProps,
            channelType: General.DM_CHANNEL as ChannelType,
            value: 'Hello @user1',
        };

        const {result} = renderHook(() => usePersistentNotificationProps(props));

        expect(result.current.persistentNotificationsEnabled).toBe(true);
        expect(result.current.noMentionsError).toBe(false);
        expect(result.current.mentionsList).toEqual([]);
    });

    it('should disable when priority is not urgent', () => {
        const props = {
            ...baseProps,
            postPriority: {
                priority: PostPriorityType.IMPORTANT,
                persistent_notifications: true,
            },
        };

        const {result} = renderHook(() => usePersistentNotificationProps(props));

        expect(result.current.persistentNotificationsEnabled).toBe(false);
        expect(result.current.noMentionsError).toBe(false);
        expect(result.current.mentionsList).toEqual([]);
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';

import TestHelper from '@test/test_helper';
import {getNotificationProps} from '@utils/user';

import useNotificationProps from './notification_props';

describe('useNotificationProps', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return result of getNotificationProps when given a user', () => {
        const notifyProps = TestHelper.fakeUserNotifyProps({channel: 'true', push: 'all'});
        const user = TestHelper.fakeUserModel({notifyProps});
        const expectedProps = notifyProps;

        const {result} = renderHook(() => useNotificationProps(user));

        expect(result.current).toEqual(expectedProps);
    });

    test('should call getNotificationProps with undefined when currentUser is undefined', () => {
        const defaultProps = getNotificationProps(undefined);

        const {result} = renderHook(() => useNotificationProps(undefined));

        expect(result.current).toEqual(defaultProps);
    });

    test('should memoize based on notifyProps and not recompute when user reference changes but notifyProps is same', () => {
        const notifyProps = TestHelper.fakeUserNotifyProps({channel: 'false'});
        const user1 = TestHelper.fakeUserModel({notifyProps});
        const user2 = TestHelper.fakeUserModel({...user1, id: 'other-id'});
        user2.notifyProps = notifyProps;
        const expectedProps = notifyProps;

        const {result, rerender} = renderHook(
            ({currentUser}) => useNotificationProps(currentUser),
            {initialProps: {currentUser: user1}},
        );

        expect(result.current).toEqual(expectedProps);

        act(() => {
            rerender({currentUser: user2});
        });

        expect(result.current).toEqual(expectedProps);
    });

    test('should recompute when notifyProps changes', () => {
        const notifyProps1 = TestHelper.fakeUserNotifyProps({channel: 'false'});
        const notifyProps2 = TestHelper.fakeUserNotifyProps({channel: 'true'});
        const user1 = TestHelper.fakeUserModel({notifyProps: notifyProps1});
        const user2 = TestHelper.fakeUserModel({...user1, notifyProps: notifyProps2});

        const {result, rerender} = renderHook(
            ({currentUser}) => useNotificationProps(currentUser),
            {initialProps: {currentUser: user1}},
        );

        expect(result.current).toEqual(notifyProps1);

        act(() => {
            rerender({currentUser: user2});
        });

        expect(result.current).toEqual(notifyProps2);
    });

    test('should recompute when notifyProps changes even if user reference doesnt change', () => {
        const notifyProps1 = TestHelper.fakeUserNotifyProps({channel: 'false'});
        const notifyProps2 = TestHelper.fakeUserNotifyProps({channel: 'true'});
        const user1 = TestHelper.fakeUserModel({notifyProps: notifyProps1});

        const {result, rerender} = renderHook(
            ({currentUser}) => useNotificationProps(currentUser),
            {initialProps: {currentUser: user1}},
        );

        expect(result.current).toEqual(notifyProps1);

        user1.notifyProps = notifyProps2;
        act(() => {
            rerender({currentUser: user1});
        });

        expect(result.current).toEqual(notifyProps2);
    });
});

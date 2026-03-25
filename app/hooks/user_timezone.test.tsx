// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';

import TestHelper from '@test/test_helper';

import useUserTimezoneProps from './user_timezone';

describe('useUserTimezoneProps', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return result of getUserTimezoneProps when given a user with timezone', () => {
        const timezone = {useAutomaticTimezone: 'true', automaticTimezone: 'America/New_York', manualTimezone: 'America/Los_Angeles'};
        const user = TestHelper.fakeUserModel({timezone});
        const expectedProps = {useAutomaticTimezone: true, automaticTimezone: 'America/New_York', manualTimezone: 'America/Los_Angeles'};

        const {result} = renderHook(() => useUserTimezoneProps(user));

        expect(result.current).toEqual(expectedProps);
    });

    test('should call getUserTimezoneProps with undefined when currentUser is undefined', () => {
        const defaultProps = {useAutomaticTimezone: true, automaticTimezone: '', manualTimezone: ''};

        const {result} = renderHook(() => useUserTimezoneProps(undefined));

        expect(result.current).toEqual(defaultProps);
    });

    test('should not recompute on rerender when same user is passed', () => {
        const timezone = {useAutomaticTimezone: 'false', automaticTimezone: '', manualTimezone: 'Europe/London'};
        const user = TestHelper.fakeUserModel({timezone});
        const expectedProps = {useAutomaticTimezone: false, automaticTimezone: '', manualTimezone: 'Europe/London'};

        const {result, rerender} = renderHook(() => useUserTimezoneProps(user));

        expect(result.current).toEqual(expectedProps);

        act(() => {
            rerender();
        });

        expect(result.current).toEqual(expectedProps);
    });

    test('should recompute when timezone changes', () => {
        const timezone1 = {useAutomaticTimezone: 'true', automaticTimezone: 'America/New_York', manualTimezone: ''};
        const timezone2 = {useAutomaticTimezone: 'false', automaticTimezone: '', manualTimezone: 'Europe/London'};
        const user1 = TestHelper.fakeUserModel({timezone: timezone1});
        const user2 = TestHelper.fakeUserModel({...user1, timezone: timezone2});

        const {result, rerender} = renderHook(
            ({currentUser}) => useUserTimezoneProps(currentUser),
            {initialProps: {currentUser: user1}},
        );

        expect(result.current).toEqual({useAutomaticTimezone: true, automaticTimezone: 'America/New_York', manualTimezone: ''});

        act(() => {
            rerender({currentUser: user2});
        });

        expect(result.current).toEqual({useAutomaticTimezone: false, automaticTimezone: '', manualTimezone: 'Europe/London'});
    });

    test('should not recompute when user reference changes but timezone is the same', () => {
        const timezone = {useAutomaticTimezone: 'true', automaticTimezone: 'America/Chicago', manualTimezone: ''};
        const user1 = TestHelper.fakeUserModel({timezone});
        const user2 = TestHelper.fakeUserModel({...user1, id: 'other-id'});
        (user2 as typeof user1).timezone = timezone;
        const expectedProps = {useAutomaticTimezone: true, automaticTimezone: 'America/Chicago', manualTimezone: ''};

        const {result, rerender} = renderHook(
            ({currentUser}) => useUserTimezoneProps(currentUser),
            {initialProps: {currentUser: user1}},
        );

        expect(result.current).toEqual(expectedProps);

        act(() => {
            rerender({currentUser: user2});
        });

        expect(result.current).toEqual(expectedProps);
    });

    test('should recompute when timezone changes even if user reference doesnt change', () => {
        const timezone1 = {useAutomaticTimezone: 'true', automaticTimezone: 'America/New_York', manualTimezone: ''};
        const timezone2 = {useAutomaticTimezone: 'false', automaticTimezone: '', manualTimezone: 'Europe/London'};
        const user1 = TestHelper.fakeUserModel({timezone: timezone1});

        const {result, rerender} = renderHook(
            ({currentUser}) => useUserTimezoneProps(currentUser),
            {initialProps: {currentUser: user1}},
        );

        expect(result.current).toEqual({useAutomaticTimezone: true, automaticTimezone: 'America/New_York', manualTimezone: ''});

        user1.timezone = timezone2;

        act(() => {
            rerender({currentUser: user1});
        });

        expect(result.current).toEqual({useAutomaticTimezone: false, automaticTimezone: '', manualTimezone: 'Europe/London'});
    });
});

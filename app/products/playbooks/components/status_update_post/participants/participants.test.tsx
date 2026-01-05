// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';
import {Platform} from 'react-native';

import CompassIcon from '@components/compass_icon';
import UsersList from '@components/user_avatars_stack/users_list';
import DatabaseManager from '@database/manager';
import {useIsTablet} from '@hooks/device';
import {bottomSheet} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Participants from './participants';

import type {Database} from '@nozbe/watermelondb';
import type {AvailableScreens} from '@typings/screens/navigation';

jest.mock('@components/compass_icon', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(CompassIcon).mockImplementation((props) => React.createElement('CompassIcon', {...props, testID: 'compass-icon'}) as any);

jest.mock('@components/user_avatars_stack/users_list', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(UsersList).mockImplementation((props) => React.createElement('UsersList', {...props, testID: 'users-list'}));

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(),
}));

describe('Participants', () => {
    const location = 'Channel' as AvailableScreens;
    const user1 = TestHelper.fakeUserModel({
        id: 'user-1',
        username: 'user1',
    });
    const user2 = TestHelper.fakeUserModel({
        id: 'user-2',
        username: 'user2',
    });
    const user3 = TestHelper.fakeUserModel({
        id: 'user-3',
        username: 'user3',
    });

    function getBaseProps(): ComponentProps<typeof Participants> {
        return {
            participantIds: ['user-1', 'user-2'],
            users: [user1, user2],
            location,
            baseTextStyle: {},
        };
    }

    let database: Database;
    const serverUrl = 'server-url';

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.mocked(useIsTablet).mockReturnValue(false);
        Platform.OS = 'ios';

        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('renders correctly with participants', () => {
        const props = getBaseProps();
        const {getByTestId, getByText} = renderWithEverything(<Participants {...props}/>, {database});

        const icon = getByTestId('compass-icon');
        expect(icon).toBeTruthy();
        expect(icon).toHaveProp('name', 'account-multiple-outline');

        expect(getByText('2 participants')).toBeVisible();
    });

    it('displays singular form for one participant', () => {
        const props = getBaseProps();
        props.participantIds = ['user-1'];
        props.users = [user1];
        const {getByText} = renderWithEverything(<Participants {...props}/>, {database, serverUrl});

        expect(getByText('1 participant')).toBeVisible();
    });

    it('opens bottom sheet when pressed', async () => {
        const props = getBaseProps();
        const {root} = renderWithEverything(<Participants {...props}/>, {database, serverUrl});

        await act(async () => {
            fireEvent.press(root);
        });

        await waitFor(() => {
            expect(bottomSheet).toHaveBeenCalledWith(expect.objectContaining({
                closeButtonId: 'close-set-user-status',
                renderContent: expect.any(Function),
                initialSnapIndex: 1,
                snapPoints: expect.any(Array),
                title: 'Participants',
                theme: expect.any(Object),
            }));
        });
    });

    it('renders UsersList in bottom sheet content', async () => {
        const props = getBaseProps();
        const {root} = renderWithEverything(<Participants {...props}/>, {database, serverUrl});

        await act(async () => {
            fireEvent.press(root);
        });

        await waitFor(() => {
            const args = jest.mocked(bottomSheet).mock.calls[0][0];
            const Content = args.renderContent;
            const {getByTestId} = renderWithEverything(<Content/>, {database, serverUrl});
            const usersList = getByTestId('users-list');
            expect(usersList).toBeTruthy();
            expect(usersList.props.users).toEqual([user1, user2]);
            expect(usersList.props.location).toBe(location);
        });
    });

    it('shows list header on non-tablet devices', async () => {
        jest.mocked(useIsTablet).mockReturnValue(false);
        const props = getBaseProps();
        const {root} = renderWithEverything(<Participants {...props}/>, {database, serverUrl});

        await act(async () => {
            fireEvent.press(root);
        });

        await waitFor(() => {
            const args = jest.mocked(bottomSheet).mock.calls[0][0];
            const Content = args.renderContent;
            const {getByText} = renderWithEverything(<Content/>, {database, serverUrl});
            expect(getByText('Participants')).toBeTruthy();
        });
    });

    it('hides list header on tablet devices', async () => {
        jest.mocked(useIsTablet).mockReturnValue(true);
        const props = getBaseProps();
        const {root} = renderWithEverything(<Participants {...props}/>, {database, serverUrl});

        await act(async () => {
            fireEvent.press(root);
        });

        await waitFor(() => {
            const args = jest.mocked(bottomSheet).mock.calls[0][0];
            const Content = args.renderContent;
            const {queryByText} = renderWithEverything(<Content/>, {database, serverUrl});
            expect(queryByText('Participants')).toBeNull();
        });
    });

    it('calculates snap points correctly for few users', async () => {
        const props = getBaseProps();
        props.participantIds = ['user-1', 'user-2'];
        props.users = [user1, user2];
        const {root} = renderWithEverything(<Participants {...props}/>, {database, serverUrl});

        await act(async () => {
            fireEvent.press(root);
        });

        await waitFor(() => {
            const args = jest.mocked(bottomSheet).mock.calls[0][0];
            expect(args.snapPoints).toHaveLength(2);
            expect(args.snapPoints[0]).toBe(1);
        });
    });

    it('adds max height snap point when users exceed max displayed', async () => {
        const users = [user1, user2, user3, TestHelper.fakeUserModel({id: 'user-4'}), TestHelper.fakeUserModel({id: 'user-5'}), TestHelper.fakeUserModel({id: 'user-6'})];
        const props = getBaseProps();
        props.participantIds = users.map((u) => u.id);
        props.users = users;
        const {root} = renderWithEverything(<Participants {...props}/>, {database, serverUrl});

        await act(async () => {
            fireEvent.press(root);
        });

        await waitFor(() => {
            const args = jest.mocked(bottomSheet).mock.calls[0][0];
            expect(args.snapPoints).toHaveLength(3);
            expect(args.snapPoints[2]).toBe('80%');
        });
    });

    it('adds android offset on Android platform', async () => {
        Platform.OS = 'android';
        const props = getBaseProps();
        const {root} = renderWithEverything(<Participants {...props}/>, {database, serverUrl});

        await act(async () => {
            fireEvent.press(root);
        });

        await waitFor(() => {
            const args = jest.mocked(bottomSheet).mock.calls[0][0];
            expect(args.snapPoints).toEqual([1, 158]);
        });
    });

    it('does not add android offset on iOS platform', async () => {
        Platform.OS = 'ios';
        const props = getBaseProps();
        const {root} = renderWithEverything(<Participants {...props}/>, {database, serverUrl});

        await act(async () => {
            fireEvent.press(root);
        });

        await waitFor(() => {
            const args = jest.mocked(bottomSheet).mock.calls[0][0];
            expect(args.snapPoints).toEqual([1, 146]);
        });
    });

    it('uses usePreventDoubleTap hook', async () => {
        const props = getBaseProps();
        const {root} = renderWithEverything(<Participants {...props}/>, {database, serverUrl});

        await act(async () => {
            fireEvent.press(root);
        });

        await waitFor(() => {
            fireEvent.press(root);
        });

        expect(bottomSheet).toHaveBeenCalledTimes(1);
    });
});


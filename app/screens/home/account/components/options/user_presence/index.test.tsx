// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import {setStatus} from '@actions/remote/user';
import {General} from '@constants';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import UserPresence from './index';

import type UserModel from '@typings/database/models/servers/user';

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@actions/remote/user', () => ({
    setStatus: jest.fn(),
}));

const currentUser = TestHelper.fakeUserModel({id: 'user-1', status: General.ONLINE});

// Open the presence sheet and render whatever it handed to bottomSheet, so the status
// rows can be pressed the same way a user presses them.
const renderStatusSheet = () => {
    const {getByTestId} = renderWithIntlAndTheme(
        <UserPresence currentUser={currentUser as UserModel}/>,
    );
    fireEvent.press(getByTestId('account.user_presence.option'));

    const renderContent = jest.mocked(bottomSheet).mock.calls[0][0] as () => React.ReactElement;
    return renderWithIntlAndTheme(renderContent());
};

describe('UserPresence', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Updating first re-rendered the account row while the sheet's views were still
    // mounted; Fabric then reparented a ReactTextView mid-commit ("addViewAt: View
    // already has a parent"), which is a host exception that destroys the React
    // instance. The ordering is the fix, so pin it.
    it.each([
        ['user_status.offline.option', General.OFFLINE],
        ['user_status.dnd.option', General.DND],
        ['user_status.away.option', General.AWAY],
        ['user_status.online.option', General.ONLINE],
    ])('should dismiss the sheet before updating the status for %s', async (testID, expectedStatus) => {
        const calls: string[] = [];
        jest.mocked(dismissBottomSheet).mockImplementation(async () => {
            calls.push('dismiss');
        });
        jest.mocked(setStatus).mockImplementation((() => {
            calls.push('setStatus');
        }) as unknown as typeof setStatus);

        const {getByTestId} = renderStatusSheet();
        fireEvent.press(getByTestId(testID));

        await waitFor(() => expect(setStatus).toHaveBeenCalledTimes(1));
        expect(calls).toEqual(['dismiss', 'setStatus']);
        expect(jest.mocked(setStatus).mock.calls[0][1]).toEqual(
            expect.objectContaining({user_id: 'user-1', status: expectedStatus, manual: true}),
        );
    });
});

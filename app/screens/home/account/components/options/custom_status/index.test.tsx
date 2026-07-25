// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fireEvent, renderWithIntl, waitFor} from '@test/intl-test-helper';

import CustomStatus from './index';

import type UserModel from '@typings/database/models/servers/user';

const mockUnsetCustomStatus = jest.fn();
const mockUpdateLocalCustomStatus = jest.fn();

jest.mock('@actions/local/user', () => ({
    updateLocalCustomStatus: (...args: unknown[]) => mockUpdateLocalCustomStatus(...args),
}));

jest.mock('@actions/remote/user', () => ({
    unsetCustomStatus: (...args: unknown[]) => mockUnsetCustomStatus(...args),
}));

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://example.com',
}));

jest.mock('@context/theme', () => ({
    useTheme: () => ({
        centerChannelColor: '#000',
    }),
}));

jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: (callback: () => void) => callback,
}));

jest.mock('@screens/navigation', () => ({
    navigateToScreen: jest.fn(),
}));

jest.mock('@utils/theme', () => ({
    makeStyleSheetFromTheme: (factory: (theme: {centerChannelColor: string}) => object) => {
        return () => factory({centerChannelColor: '#000'});
    },
}));

jest.mock('@utils/user', () => ({
    getUserCustomStatus: () => ({emoji: 'calendar', text: 'In a meeting'}),
    isCustomStatusExpired: () => false,
}));

jest.mock('./custom_label', () => {
    const {Pressable} = require('react-native');
    const MockCustomLabel = ({onClearCustomStatus}: {onClearCustomStatus: () => void}) => (
        <Pressable
            testID='clear-custom-status'
            onPress={onClearCustomStatus}
        />
    );
    MockCustomLabel.displayName = 'MockCustomLabel';
    return MockCustomLabel;
});

jest.mock('./custom_status_emoji', () => 'CustomStatusEmoji');

describe('CustomStatus', () => {
    const currentUser = {id: 'user-id'} as UserModel;

    beforeEach(() => {
        mockUnsetCustomStatus.mockReset();
        mockUpdateLocalCustomStatus.mockReset();
    });

    it('should not overwrite the user refreshed after clearing custom status', async () => {
        mockUnsetCustomStatus.mockResolvedValue({user: {id: currentUser.id}});
        const {getByTestId} = renderWithIntl(
            <CustomStatus
                currentUser={currentUser}
                isTablet={false}
            />,
        );

        fireEvent.press(getByTestId('clear-custom-status'));

        await waitFor(() => expect(mockUnsetCustomStatus).toHaveBeenCalledWith('https://example.com'));
        expect(mockUpdateLocalCustomStatus).not.toHaveBeenCalled();
    });

    it('should clear locally when the post-clear user refresh is unavailable', async () => {
        mockUnsetCustomStatus.mockResolvedValue({});
        const {getByTestId} = renderWithIntl(
            <CustomStatus
                currentUser={currentUser}
                isTablet={false}
            />,
        );

        fireEvent.press(getByTestId('clear-custom-status'));

        await waitFor(() => expect(mockUpdateLocalCustomStatus).toHaveBeenCalledWith(
            'https://example.com',
            currentUser,
            undefined,
        ));
    });
});

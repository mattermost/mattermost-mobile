// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';
import React from 'react';
import {Alert} from 'react-native';

import {permanentlyDeleteChannel} from '@actions/remote/channel';
import {navigateBack, navigateToRoot} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import PermanentDelete from './permanent_delete';

jest.mock('@actions/remote/channel', () => ({
    permanentlyDeleteChannel: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'https://channel-settings.test.com'),
}));

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
    navigateToRoot: jest.fn(),
}));

jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: jest.fn((callback) => callback),
}));

jest.mock('@utils/draft', () => ({
    alertErrorWithFallback: jest.fn(),
}));

describe('PermanentDelete', () => {
    beforeEach(() => {
        Alert.alert = jest.fn();
        jest.mocked(permanentlyDeleteChannel).mockResolvedValue({});
        jest.mocked(navigateBack).mockResolvedValue(undefined);
    });

    it('does not render without channel-delete permission', () => {
        renderWithIntlAndTheme(
            <PermanentDelete
                canDelete={false}
                channelId='channelid1'
                displayName='Test Channel'
                type='O'
            />,
        );

        expect(screen.queryByTestId('channel_settings.permanent_delete.option')).toBeNull();
    });

    it('requires confirmation and navigates away only after server confirmation', async () => {
        renderWithIntlAndTheme(
            <PermanentDelete
                canDelete={true}
                channelId='channelid1'
                displayName='Test Channel'
                type='O'
            />,
        );

        fireEvent.press(screen.getByTestId('channel_settings.permanent_delete.option'));

        expect(Alert.alert).toHaveBeenCalledWith(
            'Delete Public Channel permanently?',
            'This permanently deletes public channel Test Channel for everyone, including all messages and files. This cannot be undone. Continue only if you have a database backup.',
            expect.any(Array),
        );
        expect(permanentlyDeleteChannel).not.toHaveBeenCalled();

        const confirm = jest.mocked(Alert.alert).mock.calls[0][2]?.[1];
        await act(async () => {
            confirm?.onPress?.();
        });

        await waitFor(() => {
            expect(permanentlyDeleteChannel).toHaveBeenCalledWith('https://channel-settings.test.com', 'channelid1');
            expect(navigateBack).toHaveBeenCalled();
            expect(navigateToRoot).toHaveBeenCalled();
        });
    });
});

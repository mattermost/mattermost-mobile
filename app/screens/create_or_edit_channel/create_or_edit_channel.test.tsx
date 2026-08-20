// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {createChannel} from '@actions/remote/channel';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CreateOrEditChannel from './create_or_edit_channel';

import type {Database} from '@nozbe/watermelondb';

const mockSetOptions = jest.fn();

jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => ({
        setOptions: mockSetOptions,
        getParent: () => ({goBack: jest.fn()}),
    })),
}));

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@actions/remote/channel', () => ({
    createChannel: jest.fn(),
    patchChannel: jest.fn(),
    switchToChannelById: jest.fn(),
}));

jest.mock('@components/autocomplete', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

function lastHeaderButton() {
    const calls = mockSetOptions.mock.calls as Array<[{headerRight: () => React.ReactElement<{disabled: boolean; onPress: () => void; testID: string}>}]>;
    const headerRight = calls[calls.length - 1][0].headerRight;
    return headerRight();
}

describe('CreateOrEditChannel', () => {
    const serverUrl = 'https://example.com';
    let database: Database;

    function getBaseProps(): ComponentProps<typeof CreateOrEditChannel> {
        return {
            canCreatePublicChannels: true,
            canCreatePrivateChannels: true,
        };
    }

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
    });

    afterAll(async () => {
        await TestHelper.tearDown(serverUrl);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should keep the Create button enabled after a failed submit', async () => {
        jest.mocked(createChannel).mockResolvedValue({error: 'channel creation failed'});

        const {getByTestId} = renderWithEverything(
            <CreateOrEditChannel {...getBaseProps()}/>,
            {database, serverUrl},
        );

        act(() => {
            fireEvent.changeText(getByTestId('channel_info_form.display_name.input'), 'town-square');
        });

        await waitFor(() => {
            expect(lastHeaderButton().props.disabled).toBe(false);
        });

        await act(async () => {
            lastHeaderButton().props.onPress();
        });

        await waitFor(() => {
            expect(createChannel).toHaveBeenCalled();
            expect(lastHeaderButton().props.disabled).toBe(false);
            expect(lastHeaderButton().props.testID).toBe('create_or_edit_channel.create.button');
        });
    });
});

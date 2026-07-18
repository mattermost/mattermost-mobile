// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ThreadScreen from '@screens/thread';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ThreadRoute from './thread';

const mockUseLocalSearchParams = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('expo-router', () => ({
    useLocalSearchParams: () => mockUseLocalSearchParams(),
    useNavigation: () => ({
        goBack: jest.fn(),
        setOptions: mockSetOptions,
    }),
}));

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://example.com',
}));

jest.mock('@hooks/header', () => ({
    useDefaultHeaderHeight: () => 44,
}));

jest.mock('@screens/thread', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

describe('ThreadRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should decode the serialized root post ID before rendering the thread', () => {
        mockUseLocalSearchParams.mockReturnValue({
            channelName: '"Town Square"',
            rootId: '"6mjyxw4i3j8m9d7q2r5h"',
        });

        renderWithIntlAndTheme(<ThreadRoute/>);

        expect(jest.mocked(ThreadScreen).mock.calls[0][0]).toEqual(expect.objectContaining({
            rootId: '6mjyxw4i3j8m9d7q2r5h',
            serverUrl: 'https://example.com',
        }));
    });
});

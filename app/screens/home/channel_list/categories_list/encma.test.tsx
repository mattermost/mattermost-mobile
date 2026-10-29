// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import CategoriesList from './categories_list';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://server.example.com',
}));

jest.mock('@hooks/device', () => ({
    useIsTablet: () => false,
}));

jest.mock('@hooks/is_initial_sync', () => ({
    useIsInitialSync: () => false,
}));

jest.mock('@hooks/teams_loading', () => ({
    useTeamsLoading: () => false,
}));

jest.mock('@components/threads_button', () => {
    const ReactActual = jest.requireActual('react');
    const {Text} = jest.requireActual('react-native');
    return () => ReactActual.createElement(Text, null, 'Threads');
});

jest.mock('./categories', () => {
    const ReactActual = jest.requireActual('react');
    const {Text} = jest.requireActual('react-native');
    return () => ReactActual.createElement(Text, {testID: 'channel-list.categories'}, 'Channels');
});

jest.mock('./header', () => 'ChannelListHeader');
jest.mock('./subheader', () => 'SubHeader');

describe('ENCMA channel list navigation', () => {
    it('hides Threads without removing the conversation categories', () => {
        renderWithIntlAndTheme(
            <CategoriesList
                isCRTEnabled={true}
                moreThanOneTeam={false}
                hasChannels={true}
                draftsCount={0}
                scheduledPostCount={0}
                scheduledPostHasError={false}
            />,
        );

        expect(screen.queryByText('Threads')).toBeNull();
        expect(screen.getByTestId('channel-list.categories')).toBeTruthy();
    });
});

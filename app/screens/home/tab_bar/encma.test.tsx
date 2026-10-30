// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {Preferences, Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import TabBar from './index';

import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

jest.mock('@hooks/device', () => ({
    useWindowDimensions: () => ({width: 500, height: 1000}),
}));

jest.mock('./account', () => 'Account');
jest.mock('./home', () => 'Home');
jest.mock('./mentions', () => 'Mentions');
jest.mock('./saved_messages', () => 'SavedMessages');
jest.mock('./search', () => 'Search');

const routeTestIDs: Record<string, string> = {
    [Screens.CHANNEL_LIST]: 'tab_bar.home.tab',
    [Screens.SEARCH]: 'tab_bar.search.tab',
    [Screens.MENTIONS]: 'tab_bar.mentions.tab',
    [Screens.SAVED_MESSAGES]: 'tab_bar.saved_messages.tab',
    [Screens.ACCOUNT]: 'tab_bar.account.tab',
};

const routes = [
    Screens.CHANNEL_LIST,
    Screens.SEARCH,
    Screens.MENTIONS,
    Screens.SAVED_MESSAGES,
    Screens.ACCOUNT,
].map((name) => ({key: `${name}-key`, name}));

const descriptors = Object.fromEntries(routes.map((route) => [route.key, {
    options: {
        tabBarButtonTestID: routeTestIDs[route.name],
    },
}])) as unknown as BottomTabBarProps['descriptors'];

describe('ENCMA bottom tab bar', () => {
    it('renders only Channels and Account even when every route is registered', () => {
        const state = {
            index: 4,
            routes,
            history: [{key: 'account-key'}],
        } as unknown as BottomTabBarProps['state'];
        const navigation = {
            emit: jest.fn(() => ({defaultPrevented: false})),
            navigate: jest.fn(),
        } as unknown as BottomTabBarProps['navigation'];

        renderWithIntlAndTheme(
            <TabBar
                state={state}
                descriptors={descriptors}
                navigation={navigation}
                insets={{top: 0, right: 0, bottom: 0, left: 0}}
                theme={Preferences.THEMES.denim}
            />,
        );

        expect(screen.getByTestId('tab_bar.home.tab')).toBeTruthy();
        expect(screen.getByTestId('tab_bar.account.tab')).toBeTruthy();
        expect(screen.queryByTestId('tab_bar.search.tab')).toBeNull();
        expect(screen.queryByTestId('tab_bar.mentions.tab')).toBeNull();
        expect(screen.queryByTestId('tab_bar.saved_messages.tab')).toBeNull();

        // Account is index 4 in the original router state, but index 1 in the
        // visible ENCMA tab list. Focus must follow route identity, not the old index.
        expect(screen.getByTestId('tab_bar.account.tab').props.accessibilityState).toEqual({selected: true});
        expect(screen.getByTestId('tab_bar.home.tab').props.accessibilityState).toEqual({});
    });
});

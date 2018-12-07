// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList} from 'react-native';
import {shallow} from 'enzyme';
import Section from 'app/screens/settings/section';

import Preferences from 'mattermost-redux/constants/preferences';

import Theme from './theme';

jest.mock('react-intl');

describe('Theme', () => {
    const baseProps = {
        actions: {
            savePreferences: jest.fn(),
        },
        allowedThemes,
        navigator: {
            setOnNavigatorEvent: jest.fn(),
        },
        teamId: 'test-team',
        theme: Preferences.THEMES.default,
        userId: 'test-user',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <Theme {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find(Section).first().exists()).toEqual(true);
        expect(wrapper.find(FlatList).first().exists()).toEqual(true);
    });
});

const allowedThemes = [
    {
        default: {
            type: 'Mattermost',
            sidebarBg: '#145dbf',
            sidebarText: '#ffffff',
            sidebarUnreadText: '#ffffff',
            sidebarTextHoverBg: '#4578bf',
            sidebarTextActiveBorder: '#579eff',
            sidebarTextActiveColor: '#ffffff',
            sidebarHeaderBg: '#1153ab',
            sidebarHeaderTextColor: '#ffffff',
            onlineIndicator: '#06d6a0',
            awayIndicator: '#ffbc42',
            dndIndicator: '#f74343',
            mentionBg: '#ffffff',
            mentionColor: '#145dbf',
            centerChannelBg: '#ffffff',
            centerChannelColor: '#3d3c40',
            newMessageSeparator: '#ff8800',
            linkColor: '#2389d7',
            buttonBg: '#166de0',
            buttonColor: '#ffffff',
            errorTextColor: '#fd5960',
            mentionHighlightBg: '#ffe577',
            mentionHighlightLink: '#166de0',
            codeTheme: 'github',
        },
    },
    {
        organization: {
            type: 'Organization',
            sidebarBg: '#2071a7',
            sidebarText: '#ffffff',
            sidebarUnreadText: '#ffffff',
            sidebarTextHoverBg: '#136197',
            sidebarTextActiveBorder: '#7ab0d6',
            sidebarTextActiveColor: '#ffffff',
            sidebarHeaderBg: '#2f81b7',
            sidebarHeaderTextColor: '#ffffff',
            onlineIndicator: '#7dbe00',
            awayIndicator: '#dcbd4e',
            dndIndicator: '#ff6a6a',
            mentionBg: '#fbfbfb',
            mentionColor: '#2071f7',
            centerChannelBg: '#f2f4f8',
            centerChannelColor: '#333333',
            newMessageSeparator: '#ff8800',
            linkColor: '#2f81b7',
            buttonBg: '#1dacfc',
            buttonColor: '#ffffff',
            errorTextColor: '#a94442',
            mentionHighlightBg: '#f3e197',
            mentionHighlightLink: '#2f81b7',
            codeTheme: 'github',
        },
    },
    {
        mattermostDark: {
            type: 'Mattermost Dark',
            sidebarBg: '#1b2c3e',
            sidebarText: '#ffffff',
            sidebarUnreadText: '#ffffff',
            sidebarTextHoverBg: '#4a5664',
            sidebarTextActiveBorder: '#66b9a7',
            sidebarTextActiveColor: '#ffffff',
            sidebarHeaderBg: '#1b2c3e',
            sidebarHeaderTextColor: '#ffffff',
            onlineIndicator: '#65dcc8',
            awayIndicator: '#c1b966',
            dndIndicator: '#e81023',
            mentionBg: '#b74a4a',
            mentionColor: '#ffffff',
            centerChannelBg: '#2f3e4e',
            centerChannelColor: '#dddddd',
            newMessageSeparator: '#5de5da',
            linkColor: '#a4ffeb',
            buttonBg: '#4cbba4',
            buttonColor: '#ffffff',
            errorTextColor: '#ff6461',
            mentionHighlightBg: '#984063',
            mentionHighlightLink: '#a4ffeb',
            codeTheme: 'solarized-dark',
        },
    },
    {
        windows10: {
            type: 'Windows Dark',
            sidebarBg: '#171717',
            sidebarText: '#ffffff',
            sidebarUnreadText: '#ffffff',
            sidebarTextHoverBg: '#302e30',
            sidebarTextActiveBorder: '#196caf',
            sidebarTextActiveColor: '#ffffff',
            sidebarHeaderBg: '#1f1f1f',
            sidebarHeaderTextColor: '#ffffff',
            onlineIndicator: '#399fff',
            awayIndicator: '#c1b966',
            dndIndicator: '#e81023',
            mentionBg: '#0177e7',
            mentionColor: '#ffffff',
            centerChannelBg: '#1f1f1f',
            centerChannelColor: '#dddddd',
            newMessageSeparator: '#cc992d',
            linkColor: '#0d93ff',
            buttonBg: '#0177e7',
            buttonColor: '#ffffff',
            errorTextColor: '#ff6461',
            mentionHighlightBg: '#784098',
            mentionHighlightLink: '#a4ffeb',
            codeTheme: 'monokai',
        },
    },
];

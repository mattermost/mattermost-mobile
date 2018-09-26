// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';
import {IntlProvider} from 'react-intl';

import Preferences from 'mattermost-redux/constants/preferences';

import MenuActionSelector from './menu_action_selector.js';

jest.mock('rn-fetch-blob', () => ({
    fs: {
        dirs: {
            DocumentDir: () => jest.fn(),
            CacheDir: () => jest.fn(),
        },
    },
}));

jest.mock('rn-fetch-blob/fs', () => ({
    dirs: {
        DocumentDir: () => jest.fn(),
        CacheDir: () => jest.fn(),
    },
}));

const user1 = {id: 'id', username: 'username'};
const user2 = {id: 'id2', username: 'username2'};

const getProfiles = async () => {
    return {
        data: [user1, user2],
        error: {},
    };
};

const searchProfiles = async () => {
    return {
        data: [user2],
        error: {},
    };
};

const channel1 = {id: 'id', name: 'name', display_name: 'display_name'};
const channel2 = {id: 'id2', name: 'name2', display_name: 'display_name2'};

const getChannels = async () => {
    return {
        data: [channel1, channel2],
        error: {},
    };
};

const searchChannels = async () => {
    return {
        data: [channel2],
        error: {},
    };
};

const intlProvider = new IntlProvider({locale: 'en'}, {});
const {intl} = intlProvider.getChildContext();

describe('MenuActionSelector', () => {
    const actions = {
        getProfiles,
        getChannels,
        searchProfiles,
        searchChannels,
    };

    const baseProps = {
        actions,
        currentTeamId: 'someId',
        navigator: {
            setOnNavigatorEvent: jest.fn(),
        },
        onSelect: jest.fn(),
        data: [{text: 'text', value: 'value'}],
        dataSource: null,
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot for explicit options', async () => {
        const wrapper = shallow(
            <MenuActionSelector {...baseProps}/>,
            {context: {intl}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for users', async () => {
        const props = {
            ...baseProps,
            dataSource: 'users',
            data: [user1, user2],
        };

        const wrapper = shallow(
            <MenuActionSelector {...props}/>,
            {context: {intl}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        wrapper.setState({isLoading: false});
        wrapper.update();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for channels', async () => {
        const props = {
            ...baseProps,
            dataSource: 'channels',
            data: [channel1, channel2],
        };

        const wrapper = shallow(
            <MenuActionSelector {...props}/>,
            {context: {intl}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        wrapper.setState({isLoading: false});
        wrapper.update();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for searching', async () => {
        const props = {
            ...baseProps,
            dataSource: 'channels',
            data: [channel1, channel2],
        };

        const wrapper = shallow(
            <MenuActionSelector {...props}/>,
            {context: {intl}},
        );
        wrapper.setState({isLoading: false, searching: true, term: 'name2'});
        wrapper.update();
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {shallow} from 'enzyme';
import React from 'react';
import {IntlProvider} from 'react-intl';

import Preferences from '@mm-redux/constants/preferences';
import {Channel} from '@mm-redux/types/channels';
import {UserProfile} from '@mm-redux/types/users';

import SelectorScreen from './selector_screen';

const user1 = {id: 'id', username: 'username'} as UserProfile;
const user2 = {id: 'id2', username: 'username2'} as UserProfile;

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

const channel1 = {id: 'id', name: 'name', display_name: 'display_name'} as Channel;
const channel2 = {id: 'id2', name: 'name2', display_name: 'display_name2'} as Channel;

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

describe('SelectorScreen', () => {
    const actions = {
        getProfiles,
        getChannels,
        searchProfiles,
        searchChannels,
    };

    const baseProps = {
        actions,
        currentTeamId: 'someId',
        onSelect: jest.fn(),
        data: [{text: 'text', value: 'value'}],
        dataSource: '',
        theme: Preferences.THEMES.denim,
    };

    beforeEach(() => {
        jest.useFakeTimers();
    });

    test('should match snapshot for explicit options', () => {
        const wrapper = shallow(
            <SelectorScreen {...baseProps}/>,
            {context: {intl}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for users', () => {
        const props = {
            ...baseProps,
            dataSource: 'users',
            data: [user1, user2],
        };

        const wrapper = shallow(
            <SelectorScreen {...props}/>,
            {context: {intl}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        wrapper.setState({isLoading: false});
        wrapper.update();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for channels', () => {
        const props = {
            ...baseProps,
            dataSource: 'channels',
            data: [channel1, channel2],
        };

        const wrapper = shallow(
            <SelectorScreen {...props}/>,
            {context: {intl}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        wrapper.setState({isLoading: false});
        wrapper.update();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for searching', () => {
        const props = {
            ...baseProps,
            dataSource: 'channels',
            data: [channel1, channel2],
        };

        const wrapper = shallow(
            <SelectorScreen {...props}/>,
            {context: {intl}},
        );
        wrapper.setState({isLoading: false, searching: true, term: 'name2'});
        wrapper.update();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call getDynamicOptions if data source is dynamic', () => {
        const getDynamicOptions = jest.fn(async (term) => {
            if (term) {
                return {data: [{text: 'With Query Text', value: 'with_query'}]};
            }

            return {data: [{text: 'Without Query Text', value: 'without_query'}]};
        });

        const props = {
            ...baseProps,
            dataSource: 'dynamic',
            getDynamicOptions,
        };

        const wrapper = shallow<SelectorScreen>(
            <SelectorScreen {...props}/>,
            {context: {intl}},
        );

        jest.runAllTimers();
        setTimeout(() => {
            console.log('HERE');
            expect(props.getDynamicOptions).toHaveBeenCalledWith('');
            expect(wrapper.state().data).toEqual([
                {text: 'Without Query Text', value: 'without_query'},
            ]);
            expect(wrapper.state().searchResults).toEqual([]);

            const customList = wrapper.find('CustomList');
            expect(customList.props().data).toEqual([
                {text: 'Without Query Text', value: 'without_query'},
            ]);
        });

        // Search for value
        wrapper.instance().onSearch('mysearch');

        setTimeout(() => {
            expect(props.getDynamicOptions).toHaveBeenCalledWith('mysearch');
            expect(wrapper.state().data).toEqual([
                {text: 'Without Query Text', value: 'without_query'},
            ]);
            expect(wrapper.state().searchResults).toEqual([
                {text: 'With Query Text', value: 'with_query'},
            ]);

            const customList = wrapper.find('CustomList');
            expect(customList.props().data).toEqual([
                {text: 'With Query Text', value: 'with_query'},
            ]);
        });
    });
});

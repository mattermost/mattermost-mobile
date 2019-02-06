// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import MoreChannels from './more_channels.js';

jest.mock('react-intl');

describe('MoreChannels', () => {
    const navigator = {
        setOnNavigatorEvent: jest.fn(),
        setButtons: jest.fn(),
        dismissModal: jest.fn(),
        push: jest.fn(),
    };

    const actions = {
        handleSelectChannel: jest.fn(),
        joinChannel: jest.fn(),
        getChannels: jest.fn().mockResolvedValue({data: [{id: 'id2', name: 'name2', display_name: 'display_name2'}]}),
        searchChannels: jest.fn(),
        setChannelDisplayName: jest.fn(),
    };

    const baseProps = {
        actions,
        canCreateChannels: true,
        channels: [{id: 'id', name: 'name', display_name: 'display_name'}],
        closeButton: {},
        currentUserId: 'current_user_id',
        currentTeamId: 'current_team_id',
        navigator,
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call props.navigator.dismissModal on close', () => {
        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.instance().close();
        expect(baseProps.navigator.dismissModal).toHaveBeenCalledTimes(1);
        expect(baseProps.navigator.dismissModal).toHaveBeenCalledWith({animationType: 'slide-down'});
    });

    test('should call props.navigator.setButtons on headerButtons', () => {
        const props = {...baseProps, navigator: {...navigator, setButtons: jest.fn()}};
        const wrapper = shallow(
            <MoreChannels {...props}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(props.navigator.setButtons).toHaveBeenCalledTimes(1);
        wrapper.instance().headerButtons(true);
        expect(props.navigator.setButtons).toHaveBeenCalledTimes(2);
    });

    test('should match return value of filterChannels', () => {
        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        const channels = [{id: 'id', name: 'name', display_name: 'display_name'}];
        expect(wrapper.instance().filterChannels(channels, 'name')).toEqual([channels[0]]);
        expect(wrapper.instance().filterChannels(channels, 'display_name')).toEqual([channels[0]]);
        expect(wrapper.instance().filterChannels(channels, 'none')).toEqual([]);
        expect(wrapper.instance().filterChannels(channels, 'display_none')).toEqual([]);
    });

    test('should match state on cancelSearch', () => {
        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.setState({term: 'term'});
        wrapper.instance().cancelSearch(true);
        expect(wrapper.state('term')).toEqual('');
        expect(wrapper.state('channels')).toEqual(baseProps.channels);
    });
});

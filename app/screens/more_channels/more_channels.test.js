// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import MoreChannels from './more_channels.js';

jest.mock('react-intl');

describe('MoreChannels', () => {
    const actions = {
        handleSelectChannel: jest.fn(),
        joinChannel: jest.fn(),
        getChannels: jest.fn().mockResolvedValue({data: [{id: 'id2', name: 'name2', display_name: 'display_name2'}]}),
        searchChannels: jest.fn(),
        setChannelDisplayName: jest.fn(),
        setButtons: jest.fn(),
        dismissModal: jest.fn(),
        goToScreen: jest.fn(),
    };

    const baseProps = {
        actions,
        canCreateChannels: true,
        channels: [{id: 'id', name: 'name', display_name: 'display_name'}],
        closeButton: {},
        currentUserId: 'current_user_id',
        currentTeamId: 'current_team_id',
        theme: Preferences.THEMES.default,
        componentId: 'component-id',
        isLandscape: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call props.actions.dismissModal on close', () => {
        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.instance().close();
        expect(baseProps.actions.dismissModal).toHaveBeenCalledTimes(1);
    });

    test('should call props.actions.setButtons on setHeaderButtons', () => {
        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(baseProps.actions.setButtons).toHaveBeenCalledTimes(1);
        wrapper.instance().setHeaderButtons(true);
        expect(baseProps.actions.setButtons).toHaveBeenCalledTimes(2);
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

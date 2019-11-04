// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import * as NavigationActions from 'app/actions/navigation';

import MoreChannels from './more_channels.js';

jest.mock('react-intl');

describe('MoreChannels', () => {
    const actions = {
        handleSelectChannel: jest.fn(),
        joinChannel: jest.fn(),
        loadPublicAndArchivedChannels: jest.fn().mockResolvedValue({data: [{id: 'id2', name: 'name2', display_name: 'display_name2'}]}),
        searchChannels: jest.fn(),
        setChannelDisplayName: jest.fn(),
    };

    const baseProps = {
        actions,
        canCreateChannels: true,
        channels: [{id: 'id', name: 'name', display_name: 'display_name'}],
        archivedChannels: [{id: 'id2', name: 'archived', display_name: 'archived channel'}],
        closeButton: {},
        currentUserId: 'current_user_id',
        currentTeamId: 'current_team_id',
        theme: Preferences.THEMES.default,
        componentId: 'component-id',
        isLandscape: false,
        canShowArchivedChannels: true,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call dismissModal on close', () => {
        const dismissModal = jest.spyOn(NavigationActions, 'dismissModal');

        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.instance().close();
        expect(dismissModal).toHaveBeenCalledTimes(1);
    });

    test('should call setButtons on setHeaderButtons', () => {
        const setButtons = jest.spyOn(NavigationActions, 'setButtons');

        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(setButtons).toHaveBeenCalledTimes(1);
        wrapper.instance().setHeaderButtons(true);
        expect(setButtons).toHaveBeenCalledTimes(2);
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

    test('should search correct channels', () => {
        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        const instance = wrapper.instance();

        wrapper.setState({typeOfChannels: 'public'});
        instance.searchChannels('display_name');
        expect(wrapper.state('channels')).toEqual(baseProps.channels);

        wrapper.setState({typeOfChannels: 'archived'});
        instance.searchChannels('archived channel');
        expect(wrapper.state('archivedChannels')).toEqual(baseProps.archivedChannels);
    });
});

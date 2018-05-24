// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {configure, shallow} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import MoreChannels from './more_channels.js';

jest.mock('react-intl');

describe('MoreChannels', () => {
    const navigator = {
        setOnNavigatorEvent: () => {}, // eslint-disable-line no-empty-function
        setButtons: () => {}, // eslint-disable-line no-empty-function
        dismissModal: () => {}, // eslint-disable-line no-empty-function
        push: () => {}, // eslint-disable-line no-empty-function
    };

    const actions = {
        handleSelectChannel: () => {}, // eslint-disable-line no-empty-function
        joinChannel: () => {}, // eslint-disable-line no-empty-function
        getChannels: () => {}, // eslint-disable-line no-empty-function
        removeHiddenDefaultChannel: () => {}, // eslint-disable-line no-empty-function
        searchChannels: () => {}, // eslint-disable-line no-empty-function
        setChannelDisplayName: () => {}, // eslint-disable-line no-empty-function
    };

    const baseProps = {
        currentUserId: 'current_user_id',
        currentTeamId: 'current_team_id',
        navigator,
        theme: {
            centerChannelBg: '#aaa',
            centerChannelColor: '#aaa',
            sidebarHeaderBg: '#aaa',
            sidebarHeaderTextColor: '#aaa',
        },
        canCreateChannels: true,
        channels: [{id: 'id', name: 'name', display_name: 'display_name'}],
        closeButton: {},
        requestStatus: {},
        actions,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper).toMatchSnapshot();
    });

    test('should call props.navigator.dismissModal on close', () => {
        const props = {...baseProps, navigator: {...navigator, dismissModal: jest.fn()}};
        const wrapper = shallow(
            <MoreChannels {...props}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.instance().close();
        expect(props.navigator.dismissModal).toHaveBeenCalledTimes(1);
        expect(props.navigator.dismissModal).toHaveBeenCalledWith({animationType: 'slide-down'});
    });

    test('should call headerButtons on emitCanCreateChannel', () => {
        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        const instance = wrapper.instance();
        instance.headerButtons = jest.fn();

        wrapper.instance().emitCanCreateChannel(true);
        expect(instance.headerButtons).toHaveBeenCalledTimes(1);
        expect(instance.headerButtons).toHaveBeenCalledWith(baseProps.canCreateChannels, true);

        wrapper.instance().emitCanCreateChannel(false);
        expect(instance.headerButtons).toHaveBeenCalledTimes(2);
        expect(instance.headerButtons).toHaveBeenCalledWith(baseProps.canCreateChannels, false);
    });

    test('should match state on handleCreateScreenVisible', () => {
        const wrapper = shallow(
            <MoreChannels {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.setState({createScreenVisible: false});

        wrapper.instance().handleCreateScreenVisible(true);
        expect(wrapper.state('createScreenVisible')).toEqual(true);

        wrapper.instance().handleCreateScreenVisible(false);
        expect(wrapper.state('createScreenVisible')).toEqual(false);
    });

    test('should call props.navigator.setButtons on headerButtons', () => {
        const props = {...baseProps, navigator: {...navigator, setButtons: jest.fn()}};
        const wrapper = shallow(
            <MoreChannels {...props}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(props.navigator.setButtons).toHaveBeenCalledTimes(1);
        wrapper.instance().headerButtons();
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
        const props = {...baseProps, actions: {...actions, getChannels: jest.fn()}};
        const wrapper = shallow(
            <MoreChannels {...props}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.setState({term: 'term', searching: true, page: 1});
        wrapper.instance().cancelSearch(true);
        expect(props.actions.getChannels).toHaveBeenCalledTimes(1);
        expect(props.actions.getChannels).toHaveBeenCalledWith(props.currentTeamId, 0);
        expect(wrapper.state('term')).toEqual('');
        expect(wrapper.state('searching')).toEqual(false);
        expect(wrapper.state('page')).toEqual(0);
    });
});

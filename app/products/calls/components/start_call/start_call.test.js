// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import nock from 'nock';
import React from 'react';
import {Alert, TouchableHighlight} from 'react-native';

import {Client4} from '@client/rest';
import Preferences from '@mm-redux/constants/preferences';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import {shallowWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import StartCall from './start_call';

describe('StartCall', () => {
    beforeAll(async () => {
        await TestHelper.initBasic(Client4);
    });

    afterAll(async () => {
        await TestHelper.tearDown();
    });

    const baseProps = {
        actions: {
            joinCall: jest.fn(),
        },
        testID: 'test-id',
        theme: Preferences.THEMES.denim,
        currentChannelId: 'channel-id',
        currentChannelName: 'Channel Name',
        canStartCall: true,
        callChannelName: 'Call channel name',
        confirmToJoin: false,
        alreadyInTheCall: false,
        ongoingCall: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(<StartCall {...baseProps}/>).dive();

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when there is already an ongoing call in the channel', () => {
        const props = {...baseProps, ongoingCall: true};
        const wrapper = shallowWithIntl(<StartCall {...props}/>).dive();

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should be null when you are already in the channel call', () => {
        const props = {...baseProps, alreadyInTheCall: true};
        const wrapper = shallowWithIntl(<StartCall {...props}/>).dive();

        expect(wrapper.getElement()).toBeNull();
    });

    test('should be null if you can not start a call', () => {
        const props = {...baseProps, canStartCall: false};
        const wrapper = shallowWithIntl(<StartCall {...props}/>).dive();

        expect(wrapper.getElement()).toBeNull();
    });

    test('should start on click when calls is enabled', async () => {
        nock(Client4.getCallsRoute()).
            get('/version').
            times(2).
            reply(200, {version: 1, build: 2});
        const joinCall = jest.fn();
        const props = {...baseProps, actions: {joinCall}};
        const wrapper = shallowWithIntl(<StartCall {...props}/>).dive();
        wrapper.find(ChannelInfoRow).dive().find(TouchableHighlight).simulate('press');

        // This is so that the awaited call within ClientCalls in products/calls/client/rest.ts has
        // a chance to be completed by nock:
        await Client4.doFetch(
            `${Client4.getUrl()}/plugins/com.mattermost.calls/version`,
            {method: 'get'},
        );

        expect(Alert.alert).not.toHaveBeenCalled();
        expect(props.actions.joinCall).toHaveBeenCalled();
    });

    test('should not start on click and should show alert when calls is not enabled', async () => {
        nock(Client4.getCallsRoute()).
            get('/version').
            times(2).
            reply(404);
        const joinCall = jest.fn();
        const props = {...baseProps, actions: {joinCall}};
        const wrapper = shallowWithIntl(<StartCall {...props}/>).dive();
        wrapper.find(ChannelInfoRow).dive().find(TouchableHighlight).simulate('press');

        // This is so that the awaited call within ClientCalls in products/calls/client/rest.ts has
        // a chance to be completed by nock:
        try {
            await Client4.doFetch(
                `${Client4.getUrl()}/plugins/com.mattermost.calls/version`,
                {method: 'get'},
            );
        } catch (e) {
            // expected
        }

        expect(Alert.alert).toHaveBeenCalled();
        expect(props.actions.joinCall).not.toHaveBeenCalled();
    });

    test('should ask for confirmation on click', async () => {
        nock(Client4.getCallsRoute()).
            get('/version').
            times(2).
            reply(200, {version: 1, build: 2});
        const joinCall = jest.fn();
        const props = {...baseProps, confirmToJoin: true, actions: {joinCall}};
        const wrapper = shallowWithIntl(<StartCall {...props}/>).dive();

        wrapper.find(ChannelInfoRow).dive().find(TouchableHighlight).simulate('press');

        // This is so that the awaited call within ClientCalls in products/calls/client/rest.ts has
        // a chance to be completed by nock:
        await Client4.doFetch(
            `${Client4.getUrl()}/plugins/com.mattermost.calls/version`,
            {method: 'get'},
        );

        expect(Alert.alert).toHaveBeenCalled();
        expect(props.actions.joinCall).not.toHaveBeenCalled();
    });
});

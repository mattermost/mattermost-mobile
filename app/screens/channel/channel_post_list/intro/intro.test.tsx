// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useLayoutEffect} from 'react';
import {ActivityIndicator} from 'react-native';

import {General} from '@constants';
import {useServerUrl} from '@context/server';
import EphemeralStore from '@store/ephemeral_store';
import {act, renderWithIntlAndTheme} from '@test/intl-test-helper';

import Intro from './intro';

import type ChannelModel from '@typings/database/models/servers/channel';

jest.mock('@context/server');
jest.mock('./public_or_private_channel', () => {
    const {Text: MockText} = jest.requireActual('react-native');
    const PublicOrPrivateChannel = () => <MockText testID='intro.public_or_private'>{'intro'}</MockText>;
    return PublicOrPrivateChannel;
});

const serverUrl = 'https://server.test';
const channel = {id: 'channel-id', name: 'some-channel', displayName: 'Some channel', type: General.OPEN_CHANNEL} as ChannelModel;

// Layout effects run after the render and before passive effects, so this ends the load
// exactly between the Intro reading the store and subscribing to its events.
const StopLoadingBeforeSubscribe = () => {
    useLayoutEffect(() => {
        EphemeralStore.stopLoadingMessagesForChannel(serverUrl, channel.id);
    }, []);
    return null;
};

describe('Intro', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.mocked(useServerUrl).mockReturnValue(serverUrl);
    });

    afterEach(() => {
        EphemeralStore.stopLoadingMessagesForChannel(serverUrl, channel.id);
        jest.useRealTimers();
    });

    it('should show the intro when the load ends before the Intro subscribes', () => {
        EphemeralStore.addLoadingMessagesForChannel(serverUrl, channel.id);

        const {queryByTestId, UNSAFE_root} = renderWithIntlAndTheme(
            <>
                <Intro
                    channel={channel}
                    managementDenied={false}
                    roles={[]}
                />
                <StopLoadingBeforeSubscribe/>
            </>,
        );
        act(() => {
            jest.advanceTimersByTime(600);
        });

        expect(UNSAFE_root.findAllByType(ActivityIndicator).length).toBe(0);
        expect(queryByTestId('intro.public_or_private')).toBeTruthy();
    });

    it('should show a spinner while loading and the intro once the load ends', () => {
        EphemeralStore.addLoadingMessagesForChannel(serverUrl, channel.id);

        const {queryByTestId, UNSAFE_root} = renderWithIntlAndTheme(
            <Intro
                channel={channel}
                managementDenied={false}
                roles={[]}
            />,
        );
        act(() => {
            jest.advanceTimersByTime(600);
        });
        expect(UNSAFE_root.findAllByType(ActivityIndicator).length).toBe(1);
        expect(queryByTestId('intro.public_or_private')).toBeNull();

        act(() => {
            EphemeralStore.stopLoadingMessagesForChannel(serverUrl, channel.id);
        });
        expect(UNSAFE_root.findAllByType(ActivityIndicator).length).toBe(0);
        expect(queryByTestId('intro.public_or_private')).toBeTruthy();
    });
});

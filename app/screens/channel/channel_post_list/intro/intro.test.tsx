// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ActivityIndicator, DeviceEventEmitter} from 'react-native';

import {Events, General} from '@constants';
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

describe('Intro', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.mocked(useServerUrl).mockReturnValue(serverUrl);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('should show the intro when the load finished before the component subscribed', () => {
        // The render reads "loading", and the load ends (with its event) before the effect subscribes.
        jest.spyOn(EphemeralStore, 'isLoadingMessagesForChannel').mockReturnValueOnce(true).mockReturnValue(false);

        const {queryByTestId} = renderWithIntlAndTheme(
            <Intro
                channel={channel}
                roles={[]}
            />,
        );
        act(() => {
            jest.advanceTimersByTime(600);
        });

        expect(queryByTestId('intro.public_or_private')).toBeTruthy();
    });

    it('should show a spinner while loading and the intro once the load ends', () => {
        jest.spyOn(EphemeralStore, 'isLoadingMessagesForChannel').mockReturnValue(true);

        const {queryByTestId, UNSAFE_root} = renderWithIntlAndTheme(
            <Intro
                channel={channel}
                roles={[]}
            />,
        );
        act(() => {
            jest.advanceTimersByTime(600);
        });
        expect(queryByTestId('intro.public_or_private')).toBeNull();
        expect(UNSAFE_root.findAllByType(ActivityIndicator)).toHaveLength(1);

        act(() => {
            DeviceEventEmitter.emit(Events.LOADING_CHANNEL_POSTS, {serverUrl, channelId: channel.id, value: false});
        });

        expect(queryByTestId('intro.public_or_private')).toBeTruthy();
    });
});

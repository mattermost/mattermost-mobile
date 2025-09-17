// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {render} from '@test/intl-test-helper';

import AtMention from './at_mention/';
import Autocomplete from './autocomplete';
import ChannelMention from './channel_mention/';
import EmojiSuggestion from './emoji_suggestion/';
import SlashSuggestion from './slash_suggestion/';
import AppSlashSuggestion from './slash_suggestion/app_slash_suggestion/';

import type {SharedValue} from 'react-native-reanimated';

jest.mock('./at_mention/');
jest.mocked(AtMention).mockImplementation((props) => React.createElement('AtMention', {...props, testID: 'at-mention-mock'}));

jest.mock('./channel_mention/');
jest.mocked(ChannelMention).mockImplementation((props) => React.createElement('ChannelMention', {...props, testID: 'channel-mention-mock'}));

jest.mock('./emoji_suggestion/');
jest.mocked(EmojiSuggestion).mockImplementation((props) => React.createElement('EmojiSuggestion', {...props, testID: 'emoji-suggestion-mock'}));

jest.mock('./slash_suggestion/');
jest.mocked(SlashSuggestion).mockImplementation((props) => React.createElement('SlashSuggestion', {...props, testID: 'slash-suggestion-mock'}));

jest.mock('./slash_suggestion/app_slash_suggestion/');
jest.mocked(AppSlashSuggestion).mockImplementation((props) => React.createElement('AppSlashSuggestion', {...props, testID: 'app-slash-suggestion-mock'}));

describe('Autocomplete', () => {
    function getBaseProps(): ComponentProps<typeof Autocomplete> {
        return {
            availableSpace: {value: 0} as SharedValue<number>,
            cursorPosition: 0,
            isAppsEnabled: true,
            position: {value: 0} as SharedValue<number>,
            updateValue: jest.fn(),
            value: '',
            autocompleteProviders: {
                channel: true,
                emoji: true,
                slash: true,
                user: true,
            },
        };
    }
    it('should only render the selected autocomplete providers', () => {
        const props = getBaseProps();
        props.autocompleteProviders = {
            user: true,
            channel: true,
            emoji: true,
            slash: true,
        };
        props.channelId = 'channel-id'; // required for slash suggestions

        const {getByTestId, queryByTestId, rerender} = render(<Autocomplete {...props}/>);

        expect(getByTestId('at-mention-mock')).toBeTruthy();
        expect(getByTestId('channel-mention-mock')).toBeTruthy();
        expect(getByTestId('emoji-suggestion-mock')).toBeTruthy();
        expect(getByTestId('slash-suggestion-mock')).toBeTruthy();
        expect(getByTestId('app-slash-suggestion-mock')).toBeTruthy();

        props.autocompleteProviders = {
            user: true,
            channel: true,
            emoji: true,
            slash: false,
        };
        rerender(<Autocomplete {...props}/>);

        expect(getByTestId('at-mention-mock')).toBeTruthy();
        expect(getByTestId('channel-mention-mock')).toBeTruthy();
        expect(getByTestId('emoji-suggestion-mock')).toBeTruthy();
        expect(queryByTestId('slash-suggestion-mock')).toBeNull();
        expect(queryByTestId('app-slash-suggestion-mock')).toBeNull();

        props.autocompleteProviders = {
            user: false,
            channel: true,
            emoji: true,
            slash: true,
        };
        rerender(<Autocomplete {...props}/>);

        expect(queryByTestId('at-mention-mock')).toBeNull();
        expect(getByTestId('channel-mention-mock')).toBeTruthy();
        expect(getByTestId('emoji-suggestion-mock')).toBeTruthy();
        expect(getByTestId('slash-suggestion-mock')).toBeTruthy();
        expect(getByTestId('app-slash-suggestion-mock')).toBeTruthy();

        props.autocompleteProviders = {
            user: true,
            channel: false,
            emoji: true,
            slash: true,
        };
        rerender(<Autocomplete {...props}/>);

        expect(getByTestId('at-mention-mock')).toBeTruthy();
        expect(queryByTestId('channel-mention-mock')).toBeNull();
        expect(getByTestId('emoji-suggestion-mock')).toBeTruthy();
        expect(getByTestId('slash-suggestion-mock')).toBeTruthy();
        expect(getByTestId('app-slash-suggestion-mock')).toBeTruthy();

        props.autocompleteProviders = {
            user: true,
            channel: true,
            emoji: false,
            slash: true,
        };
        rerender(<Autocomplete {...props}/>);

        expect(getByTestId('at-mention-mock')).toBeTruthy();
        expect(getByTestId('channel-mention-mock')).toBeTruthy();
        expect(queryByTestId('emoji-suggestion-mock')).toBeNull();
        expect(getByTestId('slash-suggestion-mock')).toBeTruthy();
        expect(getByTestId('app-slash-suggestion-mock')).toBeTruthy();
    });

    it('should render with the correct horizontal padding', () => {
        const props = getBaseProps();
        const {getByTestId, rerender} = render(<Autocomplete {...props}/>);

        // Default horizontal padding is 8
        expect(getByTestId('autocomplete')).toHaveStyle({left: 8, right: 8});

        // Set horizontal padding to 20
        props.horizontalPadding = 20;
        rerender(<Autocomplete {...props}/>);

        expect(getByTestId('autocomplete')).toHaveStyle({left: 20, right: 20});
    });

    it('should set the correct max height by default', () => {
        const props = getBaseProps();
        props.availableSpace = {value: 1000} as SharedValue<number>;
        const {getByTestId} = render(<Autocomplete {...props}/>);

        // Default max height is 230
        expect(getByTestId('autocomplete')).toHaveStyle({maxHeight: 230});
    });

    it('should set the correct max height when useAllAvailableSpace is true', () => {
        const props = getBaseProps();
        props.availableSpace = {value: 1000} as SharedValue<number>;
        props.useAllAvailableSpace = true;
        const {getByTestId} = render(<Autocomplete {...props}/>);

        expect(getByTestId('autocomplete')).toHaveStyle({maxHeight: 1000});
    });
});

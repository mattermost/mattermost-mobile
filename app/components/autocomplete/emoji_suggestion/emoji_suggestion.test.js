// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import EmojiSuggestion from './emoji_suggestion';

describe('EmojiSuggestion', () => {
    const baseProps = {
        actions: {
            addReactionToLatestPost: jest.fn(),
            autocompleteCustomEmojis: jest.fn(),
        },
        emojis: [],
        fuse: {},
        theme: {},
        onChangeText: jest.fn(),
        onResultCountChange: jest.fn(),
    };

    test('should render component without error', () => {
        const wrapper = shallow(
            <EmojiSuggestion {...baseProps}/>,
        );
        expect(wrapper.type()).toEqual(null);
    });

    test('fire onResultCountChange when emoji was not found', () => {
        const wrapper = shallow(
            <EmojiSuggestion {...baseProps}/>,
        );
        const props2 = {
            value: 'A🇺🇸Z',
        };
        wrapper.setProps(props2);
        expect(baseProps.onResultCountChange).toHaveBeenCalled();
        expect(baseProps.onResultCountChange).toHaveBeenLastCalledWith(0);
    });

    test('fire appropriate function when emoji was found', () => {
        const wrapper = shallow(
            <EmojiSuggestion {...baseProps}/>,
        );
        wrapper.instance().handleFuzzySearch = jest.fn();
        const props2 = {
            value: ':sweat',
        };
        wrapper.setProps(props2);
        expect(baseProps.actions.autocompleteCustomEmojis).toHaveBeenCalledTimes(1);
        expect(baseProps.actions.autocompleteCustomEmojis).toHaveBeenLastCalledWith('sweat');

        const props3 = {
            value: ':sweat',
            emojis: ['sweat'],
        };
        wrapper.setProps(props3);
        expect(wrapper.instance().handleFuzzySearch).toHaveBeenCalledTimes(1);
    });
});

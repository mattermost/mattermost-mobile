// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';
import {
    FlatList,
} from 'react-native';

import SlashSuggestion from './slash_suggestion';

describe('SlashSuggestion', () => {
    const baseProps = {
        actions: {
            getAutocompleteCommands: jest.fn(),
        },
        fuse: {},
        theme: {},
        onChangeText: jest.fn(),
        onResultCountChange: jest.fn(),
        currentTeamId: '',
        isLandscape: false,
    };

    test('should render component without error', () => {
        const wrapper = shallow(
            <SlashSuggestion {...baseProps}/>,
        );
        expect(wrapper.type()).toEqual(null);
    });

    test('fire onResultCountChange when slash command was not found', () => {
        const wrapper = shallow(
            <SlashSuggestion {...baseProps}/>,
        );
        const props2 = {
            value: 'A🇺🇸Z',
        };
        wrapper.setProps(props2);
        expect(baseProps.onResultCountChange).toHaveBeenCalled();
        expect(baseProps.onResultCountChange).toHaveBeenLastCalledWith(0);
    });

    test('fire appropriate function when slash command was found', () => {
        const wrapper = shallow(
            <SlashSuggestion {...baseProps}/>,
        );
        wrapper.instance().handleFuzzySearch = jest.fn();
        const props2 = {
            value: '/awa',
            commands: [{auto_complete: true, display_name: 'away'}],
            currentTeamId: 'team1',
        };
        wrapper.setProps(props2);
        expect(baseProps.actions.getAutocompleteCommands).toHaveBeenCalledTimes(1);
        expect(baseProps.actions.getAutocompleteCommands).toHaveBeenLastCalledWith('team1');
        expect(wrapper.find(FlatList).exists()).toBe(true);
        expect(baseProps.onResultCountChange).toHaveBeenLastCalledWith(1);
    });
});

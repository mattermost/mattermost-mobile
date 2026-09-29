// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, render} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {Preferences} from '@constants';

import BotSelectorItem, {type AgentSelectorItem} from './bot_selector_item';

// Mock SlideUpPanelItem to avoid complex dependencies
jest.mock('@components/slide_up_panel_item', () => {
    const {Text, TouchableOpacity, View} = require('react-native');
    const MockSlideUpPanelItem = ({
        testID,
        text,
        onPress,
        leftIcon,
        rightIcon,
    }: {
        testID: string;
        text: string;
        onPress: () => void;
        leftIcon: string | {uri: string};
        rightIcon?: string;
    }) => (
        <TouchableOpacity
            testID={testID}
            onPress={onPress}
        >
            <Text testID={`${testID}.text`}>{text}</Text>
            <View testID={`${testID}.leftIcon`}>
                <Text>{typeof leftIcon === 'string' ? leftIcon : leftIcon.uri}</Text>
            </View>
            {rightIcon && (
                <View testID={`${testID}.rightIcon`}>
                    <Text>{rightIcon}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
    return MockSlideUpPanelItem;
});

describe('BotSelectorItem', () => {
    const mockBot: AgentSelectorItem = {
        id: 'bot-123',
        displayName: 'Test Bot',
        avatarUrl: undefined,
        isLocal: false,
    };

    const getBaseProps = (): ComponentProps<typeof BotSelectorItem> => ({
        bot: mockBot,
        isSelected: false,
        onSelect: jest.fn(),
        theme: Preferences.THEMES.denim,
    });

    it('should render bot display name', () => {
        const props = getBaseProps();
        const {getByText} = render(<BotSelectorItem {...props}/>);

        expect(getByText('Test Bot')).toBeTruthy();
    });

    it('should call onSelect with bot when pressed', () => {
        const props = getBaseProps();
        const {getByTestId} = render(<BotSelectorItem {...props}/>);

        fireEvent.press(getByTestId('agent_chat.bot_selector.bot_item.bot-123'));
        expect(props.onSelect).toHaveBeenCalledWith(mockBot);
    });

    it('should show check icon when selected', () => {
        const props = getBaseProps();
        props.isSelected = true;
        const {getByTestId} = render(<BotSelectorItem {...props}/>);

        // Right icon should be rendered when selected
        expect(getByTestId('agent_chat.bot_selector.bot_item.bot-123.rightIcon')).toBeTruthy();
    });

    it('should not show check icon when not selected', () => {
        const props = getBaseProps();
        props.isSelected = false;
        const {queryByTestId} = render(<BotSelectorItem {...props}/>);

        // Right icon should not be rendered when not selected
        expect(queryByTestId('agent_chat.bot_selector.bot_item.bot-123.rightIcon')).toBeNull();
    });

    it('should use avatar url when provided', () => {
        const props = getBaseProps();
        props.bot = {...props.bot, avatarUrl: 'https://example.com/avatar.png'};
        const {getByText} = render(<BotSelectorItem {...props}/>);

        // Avatar URL should be passed to leftIcon
        expect(getByText('https://example.com/avatar.png')).toBeTruthy();
    });

    it('should use fallback icon when no avatar url', () => {
        const props = getBaseProps();
        const {getByText} = render(<BotSelectorItem {...props}/>);

        // Fallback icon name should be used
        expect(getByText('account-outline')).toBeTruthy();
    });

});

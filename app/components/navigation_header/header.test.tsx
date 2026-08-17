// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, render, within} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {type NavigationButtonProps} from '@components/navigation_button';
import {Preferences} from '@constants';

import Header from './header';

describe('Header', () => {
    const getBaseProps = (): ComponentProps<typeof Header> => ({
        defaultHeight: 0,
        hasSearch: false,
        isLargeTitle: false,
        heightOffset: 0,
        theme: Preferences.THEMES.denim,
    });

    it('should render right buttons with count', () => {
        const props = getBaseProps();
        props.rightButtons = [
            {
                id: 'playbooks',
                iconName: 'playlist-check',
                count: 123,
                onPress: jest.fn(),
                testID: 'test-button',
            },
        ];
        const {getByTestId, rerender} = render(<Header {...props}/>);

        let button = getByTestId('test-button');
        expect(within(button).getByText('123')).toBeTruthy();

        props.rightButtons = [
            {
                id: 'playbooks',
                iconName: 'playlist-check',
                count: undefined,
                onPress: jest.fn(),
                testID: 'test-button',
            },
        ];
        rerender(<Header {...props}/>);
        button = getByTestId('test-button');
        expect(button).toBeOnTheScreen();
        expect(button).not.toHaveTextContent('123');
        expect(button).not.toHaveTextContent('0');
        expect(button).not.toHaveTextContent('undefined');
    });

    it('should show a spinner and ignore presses on right buttons while loading', () => {
        const props = getBaseProps();
        const onPress = jest.fn();
        const callButton: NavigationButtonProps = {
            id: 'calls',
            accessibilityLabel: 'Start call',
            iconName: 'phone',
            isLoading: true,
            onPress,
            testID: 'test-button',
        };
        props.rightButtons = [callButton];
        const {getByTestId, queryByTestId, rerender} = render(<Header {...props}/>);

        const button = getByTestId('test-button');
        expect(button.props.accessibilityLabel).toBe('Start call');
        expect(getByTestId('test-button.loading')).toBeOnTheScreen();

        fireEvent.press(button);
        expect(onPress).not.toHaveBeenCalled();

        props.rightButtons = [{...callButton, isLoading: false}];
        rerender(<Header {...props}/>);

        expect(queryByTestId('test-button.loading')).toBeNull();
        fireEvent.press(getByTestId('test-button'));
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not fire onPress on right buttons when disabled', () => {
        const props = getBaseProps();
        const onPress = jest.fn();
        props.rightButtons = [
            {
                id: 'calls',
                disabled: true,
                iconName: 'phone',
                onPress,
                testID: 'test-button',
            },
        ];
        const {getByTestId} = render(<Header {...props}/>);

        fireEvent.press(getByTestId('test-button'));
        expect(onPress).not.toHaveBeenCalled();
    });

    it('should keep the right button pressable when its icon changes', () => {
        const props = getBaseProps();
        const onPress = jest.fn();
        const callButton: NavigationButtonProps = {
            id: 'calls',
            iconName: 'phone',
            onPress,
            testID: 'call-button',
        };
        props.rightButtons = [
            callButton,
            {
                id: 'channel-quick-actions',
                iconName: 'dots-horizontal',
                onPress: jest.fn(),
                testID: 'quick-actions-button',
            },
        ];
        const {getByTestId, rerender} = render(<Header {...props}/>);

        expect(getByTestId('call-button')).toBeOnTheScreen();
        expect(getByTestId('quick-actions-button')).toBeOnTheScreen();

        // A call starting swaps the icon; the button must stay usable so an in-flight press is not lost.
        props.rightButtons = [{...callButton, iconName: 'phone-in-talk'}, props.rightButtons[1]];
        rerender(<Header {...props}/>);

        expect(getByTestId('quick-actions-button')).toBeOnTheScreen();
        fireEvent.press(getByTestId('call-button'));
        expect(onPress).toHaveBeenCalledTimes(1);
    });
});


// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, render, within} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

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

    it('right buttons are rendered with count', () => {
        const props = getBaseProps();
        props.rightButtons = [
            {
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

    it('right buttons show a spinner and cannot be pressed while loading', () => {
        const props = getBaseProps();
        const onPress = jest.fn();
        props.rightButtons = [
            {
                accessibilityLabel: 'Start call',
                iconName: 'phone',
                isLoading: true,
                onPress,
                testID: 'test-button',
            },
        ];
        const {getByTestId, queryByTestId, rerender} = render(<Header {...props}/>);

        const button = getByTestId('test-button');
        expect(button.props.accessibilityLabel).toBe('Start call');
        expect(getByTestId('test-button.loading')).toBeOnTheScreen();

        fireEvent.press(button);
        expect(onPress).not.toHaveBeenCalled();

        props.rightButtons = [{...props.rightButtons[0], isLoading: false}];
        rerender(<Header {...props}/>);

        expect(queryByTestId('test-button.loading')).toBeNull();
        fireEvent.press(getByTestId('test-button'));
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('right buttons do not fire onPress when disabled', () => {
        const props = getBaseProps();
        const onPress = jest.fn();
        props.rightButtons = [
            {
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
});


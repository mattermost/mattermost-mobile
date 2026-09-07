// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, within} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';
import {Text} from 'react-native';

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

    it('renders subtitleComponent when provided', () => {
        const props = getBaseProps();
        const subtitleText = 'Custom Subtitle';
        props.subtitleComponent = <Text testID='custom-subtitle'>{subtitleText}</Text>;
        const {getByTestId} = render(<Header {...props}/>);
        expect(getByTestId('custom-subtitle')).toBeOnTheScreen();
    });

    it('falls back to subtitle text when subtitleComponent is absent', () => {
        const props = getBaseProps();
        props.subtitle = 'Legacy subtitle';
        const {getByTestId, queryByTestId} = render(<Header {...props}/>);
        expect(getByTestId('navigation.header.subtitle')).toBeOnTheScreen();
        expect(queryByTestId('custom-subtitle')).toBeNull();
    });

    it('does not render the subtitle area when neither subtitleComponent nor subtitle is provided', () => {
        const props = getBaseProps();
        const {queryByTestId} = render(<Header {...props}/>);
        expect(queryByTestId('navigation.header.subtitle')).toBeNull();
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
});


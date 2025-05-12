// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
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
                iconName: 'bell',
                count: 123,
                onPress: jest.fn(),
                testID: 'test-button',
            },
        ];
        const {getByTestId, rerender} = render(<Header {...props}/>);

        let button = getByTestId('test-button');
        expect(button).toHaveTextContent('123');

        props.rightButtons = [
            {
                iconName: 'bell',
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


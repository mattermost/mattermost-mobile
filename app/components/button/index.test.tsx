// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, render, within} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';
import {View, Text} from 'react-native';

import {Preferences} from '@constants';

import Button from './index';

describe('components/button', () => {
    const getBaseProps = (): ComponentProps<typeof Button> => ({
        onPress: jest.fn(),
        text: 'Test Button',
        theme: Preferences.THEMES.denim,
        testID: 'test-button',
    });

    it('should render button with text', () => {
        const props = getBaseProps();
        const {getByText} = render(<Button {...props}/>);

        expect(getByText('Test Button')).toBeTruthy();
    });

    it('should handle onPress', () => {
        const props = getBaseProps();
        const {getByTestId} = render(<Button {...props}/>);

        fireEvent.press(getByTestId('test-button'));
        expect(props.onPress).toHaveBeenCalled();
    });

    it('should render with icon', () => {
        const props = getBaseProps();
        props.iconName = 'close';
        const {getByTestId} = render(<Button {...props}/>);

        const icon = getByTestId('test-button-icon');
        expect(icon).toBeTruthy();
        expect(icon.props.name).toBe('close');
    });

    it('should render disabled button', () => {
        const props = getBaseProps();
        props.disabled = true;
        const {getByTestId} = render(<Button {...props}/>);

        fireEvent.press(getByTestId('test-button'));
        expect(props.onPress).not.toHaveBeenCalled();
    });

    it('should render icon on the right', () => {
        const props = getBaseProps();
        props.isIconOnTheRight = false;
        props.iconName = 'close';

        const {getByTestId, rerender} = render(<Button {...props}/>);

        const container = getByTestId('test-button-text-container');

        // When icon is on the left, it should be the first child
        expect(within(container.children[0]).getByTestId('test-button-icon')).toBeVisible();

        props.isIconOnTheRight = true;
        rerender(<Button {...props}/>);

        // When icon is on the right, it should be the last child
        expect(within(container.children[1]).getByTestId('test-button-icon')).toBeVisible();
    });

    it('should render custom icon component', () => {
        const CustomIcon = () => (
            <View testID='custom-icon'>
                <Text>{'Custom Icon'}</Text>
            </View>
        );
        const props = getBaseProps();
        props.iconComponent = <CustomIcon/>;
        const {getByTestId} = render(<Button {...props}/>);

        expect(getByTestId('custom-icon')).toBeTruthy();
    });
});

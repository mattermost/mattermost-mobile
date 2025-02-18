// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import {View, Text} from 'react-native';

import {Preferences} from '@constants';

import Button from './index';

describe('components/button', () => {
    const theme: Theme = Preferences.THEMES.denim;

    it('should render button with text', () => {
        const {getByText} = render(
            <Button
                onPress={jest.fn()}
                text='Test Button'
                theme={theme}
            />,
        );

        expect(getByText('Test Button')).toBeTruthy();
    });

    it('should handle onPress', () => {
        const onPress = jest.fn();
        const {getByTestId} = render(
            <Button
                onPress={onPress}
                text='Test Button'
                theme={theme}
                testID='test-button'
            />,
        );

        fireEvent.press(getByTestId('test-button'));
        expect(onPress).toHaveBeenCalled();
    });

    it('should render with icon', () => {
        const {getByTestId} = render(
            <Button
                onPress={jest.fn()}
                text='Test Button'
                theme={theme}
                iconName='close'
                iconSize={24}
                testID='test-button'
            />,
        );

        const icon = getByTestId('test-button-icon');
        expect(icon).toBeTruthy();
        expect(icon.props.name).toBe('close');
    });

    it('should render disabled button', () => {
        const onPress = jest.fn();
        const {getByTestId} = render(
            <Button
                onPress={onPress}
                text='Test Button'
                theme={theme}
                disabled={true}
                testID='test-button'
            />,
        );

        fireEvent.press(getByTestId('test-button'));
        expect(onPress).not.toHaveBeenCalled();
    });

    it('should render icon on the right', () => {
        const props = {
            onPress: jest.fn(),
            text: 'Test Button',
            theme,
            iconName: 'close',
            iconSize: 24,
            isIconOnTheRight: false,
            testID: 'test-button',
        };

        const {getByTestId, rerender} = render(<Button {...props}/>);

        const container = getByTestId('test-button-text-container');

        // When icon is on the left, it should be the first child
        expect(container.children[0].props.testID).toEqual('test-button-icon');

        props.isIconOnTheRight = true;
        rerender(<Button {...props}/>);

        // When icon is on the right, it should be the last child
        expect(container.children[1].props.testID).toEqual('test-button-icon');
    });

    it('should render custom icon component', () => {
        const CustomIcon = () => (
            <View testID='custom-icon'>
                <Text>{'Custom Icon'}</Text>
            </View>
        );
        const {getByTestId} = render(
            <Button
                onPress={jest.fn()}
                text='Test Button'
                theme={theme}
                iconComponent={<CustomIcon/>}
                testID='test-button'
            />,
        );

        expect(getByTestId('custom-icon')).toBeTruthy();
    });
});

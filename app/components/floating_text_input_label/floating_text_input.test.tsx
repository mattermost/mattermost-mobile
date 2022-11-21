// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import {View} from 'react-native';

import {getDefaultThemeByAppearance} from '@app/context/theme';

import {getStyleSheet} from './styles';
import {getLabelPositions} from './utils';

import FloatingTextInput, {FloatingTextInputProps, FloatingTextInputRef} from './index';

type ConfigurableProps = Pick<FloatingTextInputProps, 'startAdornment'| 'endAdornment'|'editable' | 'error'|'errorIcon' | 'isKeyboardInput'>

const makeFloatingTextInput = ({endAdornment = null,
    startAdornment = null,
    editable = true,
    error = '',
    errorIcon = '',
    isKeyboardInput = true,
}: ConfigurableProps = {}) => {
    const theme = getDefaultThemeByAppearance();

    const onPressHandler = jest.fn();
    const onChangeHandler = jest.fn();
    const placeholder = 'Placeholder';
    const label = 'input label';
    const labelTextStyle = {
        marginTop: 15,
    };
    const value = 'initial value';
    const testID = 'text_input';

    const ref = React.createRef<FloatingTextInputRef>();

    return {
        placeholder,
        onChangeHandler,
        label,
        theme,
        labelTextStyle,
        value,
        testID,
        onPressHandler,
        ref,
        renderedElement: render(
            <FloatingTextInput
                startAdornment={startAdornment}
                endAdornment={endAdornment}
                editable={editable}
                placeholder={placeholder}
                onChange={onChangeHandler}
                label={label}
                labelTextStyle={labelTextStyle}
                theme={theme}
                value={value}
                error={error}
                errorIcon={errorIcon}
                testID={testID}
                isKeyboardInput={isKeyboardInput}
                onPress={onPressHandler}
                ref={ref}
            />),
    };
};

describe('FloatingTextInput', () => {
    it('should allow to display an adornment at the end', () => {
        const endAdornmentID = 'end-adornment';
        const EndAdornment = () => <View testID={endAdornmentID}/>;
        const {renderedElement} = makeFloatingTextInput({endAdornment: <EndAdornment/>});

        const {getByTestId} = renderedElement;

        getByTestId(endAdornmentID);
    });

    it('should allow to display an adornment at the start', () => {
        const startAdornmentID = 'start-adornment';
        const StartAdornment = () => <View testID={startAdornmentID}/>;
        const {renderedElement} = makeFloatingTextInput({startAdornment: <StartAdornment/>});

        const {getByTestId} = renderedElement;

        getByTestId(startAdornmentID);
    });

    it('should display an error state', () => {
        const errorIconName = 'laptop';
        const errorMessage = 'something went wrong';
        const {renderedElement, testID} = makeFloatingTextInput({error: errorMessage, errorIcon: errorIconName});

        const {getByText, getByTestId} = renderedElement;

        getByText(errorMessage);
        expect(getByTestId(`${testID}.error_icon`).props.name).toEqual(errorIconName);
    });

    it('should allow a non keyboard input to be pressed', () => {
        const {renderedElement, testID, onPressHandler} = makeFloatingTextInput({isKeyboardInput: false});

        const {getByTestId} = renderedElement;

        act(() => {
            fireEvent.press(getByTestId(`${testID}.container`));
        });

        expect(onPressHandler).toHaveBeenCalledTimes(1);
    });

    describe('label', () => {
        it('should display the provided label', () => {
            const {renderedElement, label} = makeFloatingTextInput();

            const {getByText} = renderedElement;

            getByText(label);
        });

        it('should support a custom label style', () => {
            const {renderedElement, label, labelTextStyle} = makeFloatingTextInput();

            const {getByText} = renderedElement;

            expect(getByText(label).props.style).toEqual(
                expect.objectContaining(labelTextStyle),
            );
        });

        it('should display the label in focused state', async () => {
            const {renderedElement, label, testID, theme} = makeFloatingTextInput();

            const {getByTestId, getByText} = renderedElement;

            const styles = getStyleSheet(theme);
            const positions = getLabelPositions(styles.textInputContainer, styles.label, styles.smallLabel);
            const size = [styles.textInput.fontSize, styles.smallLabel.fontSize];

            act(() => {
                fireEvent(getByTestId(testID), 'onFocus');
            });

            await waitFor(() => expect(getByText(label).props.animatedStyle.value).toEqual(
                expect.objectContaining({
                    backgroundColor: theme.centerChannelBg,
                    paddingHorizontal: 4,
                    color: theme.buttonBg,
                    fontSize: size[1],
                    top: positions[1],
                }),
            ));
        });

        it('should display as focused if there is a start adornment', () => {
            const StartAdornment = () => <View/>;
            const {renderedElement, label, theme} = makeFloatingTextInput({startAdornment: <StartAdornment/>});

            const styles = getStyleSheet(theme);
            const positions = getLabelPositions(styles.textInputContainer, styles.label, styles.smallLabel);
            const size = [styles.textInput.fontSize, styles.smallLabel.fontSize];

            const {getByText} = renderedElement;

            expect(getByText(label).props.animatedStyle.value).toEqual(
                expect.objectContaining({
                    backgroundColor: theme.centerChannelBg,
                    paddingHorizontal: 4,
                    fontSize: size[1],
                    top: positions[1],
                }),
            );
        });

        it('should display the label in error state', () => {
            const {renderedElement, label, theme} = makeFloatingTextInput({error: 'Something'});

            const {getByText} = renderedElement;

            expect(getByText(label).props.animatedStyle.value).toEqual(
                expect.objectContaining({
                    color: theme.errorTextColor,
                }),
            );
        });
    });

    test('test snapshot', async () => {
        expect(makeFloatingTextInput().renderedElement).toMatchSnapshot();
    });
});


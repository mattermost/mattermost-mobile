// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {Alert} from 'react-native';

import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import ControlsBar from './index';

jest.spyOn(Alert, 'alert');

describe('ControlsBar', () => {
    const getBaseProps = (): ComponentProps<typeof ControlsBar> => ({
        showStopButton: false,
        showRegenerateButton: false,
        onStop: jest.fn(),
        onRegenerate: jest.fn(),
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('button visibility', () => {
        it('should show stop button when showStopButton is true', () => {
            const props = getBaseProps();
            props.showStopButton = true;
            const {getByTestId} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            expect(getByTestId('agents.controls_bar.stop_button')).toBeTruthy();
        });

        it('should hide stop button when showStopButton is false', () => {
            const props = getBaseProps();
            props.showStopButton = false;
            const {queryByTestId} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            expect(queryByTestId('agents.controls_bar.stop_button')).toBeNull();
        });

        it('should show regenerate button when showRegenerateButton is true', () => {
            const props = getBaseProps();
            props.showRegenerateButton = true;
            const {getByTestId} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            expect(getByTestId('agents.controls_bar.regenerate_button')).toBeTruthy();
        });

        it('should hide regenerate button when showRegenerateButton is false', () => {
            const props = getBaseProps();
            props.showRegenerateButton = false;
            const {queryByTestId} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            expect(queryByTestId('agents.controls_bar.regenerate_button')).toBeNull();
        });

        it('should show both buttons when both flags are true', () => {
            const props = getBaseProps();
            props.showStopButton = true;
            props.showRegenerateButton = true;
            const {getByTestId} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            expect(getByTestId('agents.controls_bar.stop_button')).toBeTruthy();
            expect(getByTestId('agents.controls_bar.regenerate_button')).toBeTruthy();
        });

        it('should hide both buttons when both flags are false', () => {
            const props = getBaseProps();
            props.showStopButton = false;
            props.showRegenerateButton = false;
            const {queryByTestId} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            expect(queryByTestId('agents.controls_bar.stop_button')).toBeNull();
            expect(queryByTestId('agents.controls_bar.regenerate_button')).toBeNull();
        });
    });

    describe('button text', () => {
        it('should render Stop Generating text', () => {
            const props = getBaseProps();
            props.showStopButton = true;
            const {getByText} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            expect(getByText('Stop Generating')).toBeTruthy();
        });

        it('should render Regenerate text', () => {
            const props = getBaseProps();
            props.showRegenerateButton = true;
            const {getByText} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            expect(getByText('Regenerate')).toBeTruthy();
        });
    });

    describe('stop button callback', () => {
        it('should call onStop when stop button pressed', () => {
            const props = getBaseProps();
            props.showStopButton = true;
            const {getByTestId} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            fireEvent.press(getByTestId('agents.controls_bar.stop_button'));

            expect(props.onStop).toHaveBeenCalled();
        });
    });

    describe('regenerate button with confirmation', () => {
        it('should show Alert confirmation when regenerate pressed', () => {
            const props = getBaseProps();
            props.showRegenerateButton = true;
            const {getByTestId} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            fireEvent.press(getByTestId('agents.controls_bar.regenerate_button'));

            expect(Alert.alert).toHaveBeenCalledWith(
                'Regenerate Response',
                'This will clear the current response and generate a new one. Continue?',
                expect.arrayContaining([
                    expect.objectContaining({text: 'Cancel', style: 'cancel'}),
                    expect.objectContaining({text: 'Regenerate', style: 'destructive'}),
                ]),
            );
        });

        it('should not call onRegenerate immediately when regenerate pressed', () => {
            const props = getBaseProps();
            props.showRegenerateButton = true;
            const {getByTestId} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            fireEvent.press(getByTestId('agents.controls_bar.regenerate_button'));

            // onRegenerate should not be called yet - waiting for confirmation
            expect(props.onRegenerate).not.toHaveBeenCalled();
        });

        it('should call onRegenerate when confirmation is accepted', () => {
            const props = getBaseProps();
            props.showRegenerateButton = true;
            const {getByTestId} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            fireEvent.press(getByTestId('agents.controls_bar.regenerate_button'));

            // Get the alert call and simulate pressing "Regenerate"
            const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
            const buttons = alertCall[2];
            const regenerateButton = buttons.find((b: {text: string}) => b.text === 'Regenerate');
            regenerateButton.onPress();

            expect(props.onRegenerate).toHaveBeenCalled();
        });

        it('should not call onRegenerate when cancel is pressed', () => {
            const props = getBaseProps();
            props.showRegenerateButton = true;
            const {getByTestId} = renderWithIntlAndTheme(<ControlsBar {...props}/>);

            fireEvent.press(getByTestId('agents.controls_bar.regenerate_button'));

            // Get the alert call - cancel button has no onPress handler
            const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
            const buttons = alertCall[2];
            const cancelButton = buttons.find((b: {text: string}) => b.text === 'Cancel');

            // Cancel button typically has no onPress or it's undefined
            if (cancelButton.onPress) {
                cancelButton.onPress();
            }

            expect(props.onRegenerate).not.toHaveBeenCalled();
        });
    });
});

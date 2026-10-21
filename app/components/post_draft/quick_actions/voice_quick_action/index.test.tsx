// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';
import {Alert} from 'react-native';
import Permissions from 'react-native-permissions';

import {useKeyboardState} from '@context/keyboard_state';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import VoiceQuickAction from './index';

jest.mock('@context/keyboard_state', () => ({
    useKeyboardState: jest.fn(),
}));

describe('VoiceQuickAction', () => {
    const blurAndDismissKeyboard = jest.fn(() => Promise.resolve());
    const baseProps = {
        disabled: false,
        onStartRecording: jest.fn(),
        testID: 'test-voice',
    };

    beforeEach(() => {
        jest.mocked(useKeyboardState).mockReturnValue({
            blurAndDismissKeyboard,
        } as unknown as ReturnType<typeof useKeyboardState>);
        jest.spyOn(Alert, 'alert');
    });

    it('should be labelled for screen readers', () => {
        const {getByLabelText} = renderWithIntlAndTheme(<VoiceQuickAction {...baseProps}/>);

        expect(getByLabelText('Record a voice note')).toBeVisible();
    });

    it('should dismiss the keyboard and start recording when the microphone permission is granted', async () => {
        const {getByTestId} = renderWithIntlAndTheme(<VoiceQuickAction {...baseProps}/>);

        fireEvent.press(getByTestId('test-voice'));

        await waitFor(() => {
            expect(baseProps.onStartRecording).toHaveBeenCalledTimes(1);
        });
        expect(blurAndDismissKeyboard).toHaveBeenCalledTimes(1);
        expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should ask for the microphone permission and start recording once it is allowed', async () => {
        jest.mocked(Permissions.check).mockResolvedValueOnce(Permissions.RESULTS.DENIED);
        jest.mocked(Permissions.request).mockResolvedValueOnce(Permissions.RESULTS.GRANTED);
        const {getByTestId} = renderWithIntlAndTheme(<VoiceQuickAction {...baseProps}/>);

        fireEvent.press(getByTestId('test-voice'));

        await waitFor(() => {
            expect(baseProps.onStartRecording).toHaveBeenCalledTimes(1);
        });
        expect(Permissions.request).toHaveBeenCalledTimes(1);
    });

    it('should not start recording when the user declines the microphone permission', async () => {
        jest.mocked(Permissions.check).mockResolvedValueOnce(Permissions.RESULTS.DENIED).mockResolvedValueOnce(Permissions.RESULTS.DENIED);
        jest.mocked(Permissions.request).mockResolvedValueOnce(Permissions.RESULTS.DENIED);
        const {getByTestId} = renderWithIntlAndTheme(<VoiceQuickAction {...baseProps}/>);

        fireEvent.press(getByTestId('test-voice'));

        await waitFor(() => {
            expect(Permissions.request).toHaveBeenCalledTimes(1);
        });
        expect(Alert.alert).not.toHaveBeenCalled();
        expect(blurAndDismissKeyboard).not.toHaveBeenCalled();
        expect(baseProps.onStartRecording).not.toHaveBeenCalled();
    });

    it('should point to the app settings instead of recording when the microphone permission is blocked', async () => {
        jest.mocked(Permissions.check).mockResolvedValueOnce(Permissions.RESULTS.BLOCKED).mockResolvedValueOnce(Permissions.RESULTS.BLOCKED);
        const {getByTestId} = renderWithIntlAndTheme(<VoiceQuickAction {...baseProps}/>);

        fireEvent.press(getByTestId('test-voice'));

        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledTimes(1);
        });
        expect(Permissions.request).not.toHaveBeenCalled();
        expect(baseProps.onStartRecording).not.toHaveBeenCalled();
    });

    it('should be disabled and not request permission when disabled', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <VoiceQuickAction
                {...baseProps}
                disabled={true}
            />,
        );

        const button = getByTestId('test-voice.disabled');
        expect(button).toBeDisabled();
        fireEvent.press(button);

        expect(Permissions.check).not.toHaveBeenCalled();
        expect(baseProps.onStartRecording).not.toHaveBeenCalled();
    });
});

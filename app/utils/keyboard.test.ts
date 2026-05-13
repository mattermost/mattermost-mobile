// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Keyboard} from 'react-native';
import {KeyboardController} from 'react-native-keyboard-controller';

import {dismissKeyboard, isKeyboardVisible} from './keyboard';

jest.mock('@constants/device', () => ({
    isEdgeToEdge: false,
}));

jest.mock('react-native-keyboard-controller', () => ({
    KeyboardController: {
        dismiss: jest.fn(() => Promise.resolve()),
        isVisible: jest.fn(() => false),
    },
}));

describe('dismissKeyboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should call Keyboard.dismiss on non-edge-to-edge', async () => {
        await dismissKeyboard();

        expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
        expect(KeyboardController.dismiss).not.toHaveBeenCalled();
    });

    it('should call KeyboardController.dismiss with animated=false on edge-to-edge', async () => {
        const deviceModule = require('@constants/device');
        deviceModule.isEdgeToEdge = true;

        await dismissKeyboard();

        expect(KeyboardController.dismiss).toHaveBeenCalledWith({animated: false});
        expect(Keyboard.dismiss).not.toHaveBeenCalled();

        deviceModule.isEdgeToEdge = false;
    });
});

describe('isKeyboardVisible', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return Keyboard.isVisible() on non-edge-to-edge', () => {
        jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);

        expect(isKeyboardVisible()).toBe(true);
        expect(Keyboard.isVisible).toHaveBeenCalledTimes(1);
        expect(KeyboardController.isVisible).not.toHaveBeenCalled();
    });

    it('should return KeyboardController.isVisible() on edge-to-edge', () => {
        const deviceModule = require('@constants/device');
        deviceModule.isEdgeToEdge = true;
        jest.mocked(KeyboardController.isVisible).mockReturnValue(true);

        expect(isKeyboardVisible()).toBe(true);
        expect(KeyboardController.isVisible).toHaveBeenCalledTimes(1);

        deviceModule.isEdgeToEdge = false;
    });
});

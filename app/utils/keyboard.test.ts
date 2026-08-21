// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Keyboard} from 'react-native';
import {KeyboardController} from 'react-native-keyboard-controller';

import * as Device from '@constants/device';

import {dismissKeyboard, isKeyboardVisible} from './keyboard';

const setEdgeToEdge = (value: boolean) => {
    Object.defineProperty(Device, 'isEdgeToEdge', {
        configurable: true,
        get: () => value,
    });
};

describe('dismissKeyboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
        setEdgeToEdge(false);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should call Keyboard.dismiss on non-edge-to-edge', async () => {
        setEdgeToEdge(false);
        await dismissKeyboard();

        expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
        expect(KeyboardController.dismiss).not.toHaveBeenCalled();
    });

    it('should call KeyboardController.dismiss with animated=false on edge-to-edge', async () => {
        setEdgeToEdge(true);

        await dismissKeyboard();

        expect(KeyboardController.dismiss).toHaveBeenCalledWith({animated: false});
        expect(Keyboard.dismiss).not.toHaveBeenCalled();
    });
});

describe('isKeyboardVisible', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setEdgeToEdge(false);
    });

    it('should return Keyboard.isVisible() on non-edge-to-edge', () => {
        setEdgeToEdge(false);
        jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);

        expect(isKeyboardVisible()).toBe(true);
        expect(Keyboard.isVisible).toHaveBeenCalledTimes(1);
        expect(KeyboardController.isVisible).not.toHaveBeenCalled();
    });

    it('should return KeyboardController.isVisible() on edge-to-edge', () => {
        setEdgeToEdge(true);
        jest.mocked(KeyboardController.isVisible).mockReturnValue(true);

        expect(isKeyboardVisible()).toBe(true);
        expect(KeyboardController.isVisible).toHaveBeenCalledTimes(1);
    });
});

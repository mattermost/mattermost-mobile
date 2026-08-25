// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {InputContainerStateType, type StateSnapshot, type StateEvent} from '@keyboard/state_machine/types';

import {
    isSoftwareKeyboard,
    isZeroHeight,
    calculateAdjustedHeight,
    calculateKeyboardUpdates,
    getEmojiSearchActiveHeight,
    calculateSearchHeight,
} from './keyboard_utils';

jest.mock('@constants/device', () => ({isEdgeToEdge: false}));

function makeSnapshot(overrides: Partial<StateSnapshot> = {}): StateSnapshot {
    return {
        inputAccessoryHeight: 0,
        targetHeight: 0,
        postInputTranslateY: 0,
        scrollOffset: 0,
        lastKeyboardHeight: 0,
        keyboardEventHeight: 300,
        preSearchHeight: 0,
        postInputContainerHeight: 0,
        scrollPosition: 0,
        hasZeroKeyboardHeight: false,
        isDraggingKeyboard: false,
        isEmojiPickerTransition: false,
        isEmojiSearchActive: false,
        isWaitingForKeyboard: false,
        currentState: InputContainerStateType.IDLE,
        tabBarHeight: 49,
        safeAreaBottom: 34,
        ...overrides,
    };
}

function makeEvent(overrides: Partial<StateEvent> = {}): StateEvent {
    return {
        type: 'KEYBOARD_EVENT_MOVE',
        ...overrides,
    };
}

describe('isSoftwareKeyboard', () => {
    it('should return true when event.height > 75', () => {
        expect(isSoftwareKeyboard(makeSnapshot(), makeEvent({height: 300}))).toBe(true);
    });

    it('should return false when event.height <= 75', () => {
        expect(isSoftwareKeyboard(makeSnapshot(), makeEvent({height: 30}))).toBe(false);
    });

    it('should fall back to snapshot.keyboardEventHeight when event.height is undefined', () => {
        expect(isSoftwareKeyboard(makeSnapshot({keyboardEventHeight: 300}), makeEvent())).toBe(true);
    });

    it('should return false when fallback keyboardEventHeight <= 75', () => {
        expect(isSoftwareKeyboard(makeSnapshot({keyboardEventHeight: 50}), makeEvent())).toBe(false);
    });
});

describe('isZeroHeight', () => {
    it('should return false immediately when height > 75', () => {
        expect(isZeroHeight(makeSnapshot(), makeEvent({height: 300}))).toBe(false);
    });

    it('should return true when height < 75', () => {
        expect(isZeroHeight(makeSnapshot(), makeEvent({height: 30}))).toBe(true);
    });

    it('should return false when height is exactly 75 and hasZeroKeyboardHeight is false', () => {
        expect(isZeroHeight(makeSnapshot({hasZeroKeyboardHeight: false}), makeEvent({height: 75}))).toBe(false);
    });

    it('should return true when height is exactly 75 and hasZeroKeyboardHeight is true', () => {
        expect(isZeroHeight(makeSnapshot({hasZeroKeyboardHeight: true}), makeEvent({height: 75}))).toBe(true);
    });

    it('should fall back to snapshot.keyboardEventHeight when event.height is undefined', () => {
        expect(isZeroHeight(makeSnapshot({keyboardEventHeight: 30}), makeEvent())).toBe(true);
    });

    it('should return false when fallback keyboardEventHeight > 75', () => {
        expect(isZeroHeight(makeSnapshot({keyboardEventHeight: 300}), makeEvent())).toBe(false);
    });
});

describe('calculateAdjustedHeight', () => {
    it('should return 0 when rawHeight is 0', () => {
        expect(calculateAdjustedHeight(336, 49, 34, 0)).toBe(0);
    });

    it('should use rawHeight as targetHeight when lastKeyboardHeight is 0', () => {
        // lastKeyboardHeight=0, rawHeight=300, tabBarHeight=49, safeAreaBottom=0
        // targetHeight=300, keyboardProgress=min(1,300/max(300,336))=300/336
        // tabBarAdjustment=49+0*(300/336)=49
        // result=max(0,300-49)=251
        expect(calculateAdjustedHeight(0, 49, 0, 300)).toBe(251);
    });

    it('should use lastKeyboardHeight as targetHeight when positive', () => {
        // lastKeyboardHeight=336, rawHeight=200, tabBarHeight=49, safeAreaBottom=34
        // targetHeight=336, keyboardProgress=min(1,200/336)≈0.5952
        // tabBarAdjustment=49+34*0.5952≈49+20.238=69.238
        // result=max(0,200-69.238)≈130.762
        const result = calculateAdjustedHeight(336, 49, 34, 200);
        expect(result).toBeCloseTo(130.76, 1);
    });

    it('should clamp to 0 when rawHeight is less than tabBarAdjustment', () => {
        // rawHeight=10, tabBarHeight=49, safeAreaBottom=0, lastKeyboardHeight=336
        // keyboardProgress=min(1,10/336)≈0.0298
        // tabBarAdjustment=49+0*0.0298=49
        // result=max(0,10-49)=0
        expect(calculateAdjustedHeight(336, 49, 0, 10)).toBe(0);
    });

    it('should cap keyboardProgress at 1', () => {
        // rawHeight > targetHeight: rawHeight=400, lastKeyboardHeight=300
        // targetHeight=300, keyboardProgress=min(1,400/max(300,336))=min(1,400/336)=1
        // tabBarAdjustment=49+34*1=83
        // result=max(0,400-83)=317
        expect(calculateAdjustedHeight(300, 49, 34, 400)).toBe(317);
    });
});

describe('calculateKeyboardUpdates', () => {
    const originalOS = Platform.OS;

    afterEach(() => {
        (Platform as {OS: string}).OS = originalOS;
    });

    it('should use adjustedHeight when |adjustedHeight - rawKeyboardHeight| > 50', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({currentState: InputContainerStateType.IDLE});
        const result = calculateKeyboardUpdates(snapshot, 200, 300);
        expect(result.postInputTranslateY).toEqual({value: 200, animated: false});
        expect(result.scrollOffset).toBeUndefined();
    });

    it('should include scrollOffset on iOS', () => {
        (Platform as {OS: string}).OS = 'ios';
        const snapshot = makeSnapshot({currentState: InputContainerStateType.IDLE});
        const result = calculateKeyboardUpdates(snapshot, 200, 300);
        expect(result.postInputTranslateY).toEqual({value: 200, animated: false});
        expect(result.scrollOffset).toEqual({value: 200, animated: false});
    });

    it('should use adjustedHeight for non-keyboard states when no large difference', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({currentState: InputContainerStateType.IDLE});
        const result = calculateKeyboardUpdates(snapshot, 250, 260);
        expect(result.postInputTranslateY).toEqual({value: 250, animated: false});
    });

    it('should return effectiveHeight=0 for KEYBOARD_OPENING when rawHeight <= tabBarAdjustment', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({
            currentState: InputContainerStateType.KEYBOARD_OPENING,
            tabBarHeight: 49,
            safeAreaBottom: 34,
        });

        // tabBarAdjustment = 49 + 34 = 83; rawKeyboardHeight=50 <= 83 → effectiveHeight=0
        const result = calculateKeyboardUpdates(snapshot, 50, 50);
        expect(result.postInputTranslateY).toEqual({value: 0, animated: false});
    });

    it('should return rawHeight - tabBarAdjustment for KEYBOARD_OPENING when rawHeight > tabBarAdjustment', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({
            currentState: InputContainerStateType.KEYBOARD_OPENING,
            tabBarHeight: 49,
            safeAreaBottom: 34,
        });

        // tabBarAdjustment=83, rawKeyboardHeight=260, adjustedHeight=260 → |260-260|=0 ≤ 50
        // needsConstantSubtraction=true, rawHeight > tabBarAdjustment → effectiveHeight=260-83=177
        const result = calculateKeyboardUpdates(snapshot, 260, 260);
        expect(result.postInputTranslateY).toEqual({value: 177, animated: false});
    });

    it('should apply constant subtraction for KEYBOARD_OPEN state', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({
            currentState: InputContainerStateType.KEYBOARD_OPEN,
            tabBarHeight: 49,
            safeAreaBottom: 34,
        });

        // tabBarAdjustment=83, rawKeyboardHeight=300, adjustedHeight=300 → |0| ≤ 50
        // needsConstantSubtraction=true → effectiveHeight=300-83=217
        const result = calculateKeyboardUpdates(snapshot, 300, 300);
        expect(result.postInputTranslateY).toEqual({value: 217, animated: false});
    });

    it('should clamp to 0 when rawHeight - tabBarAdjustment would be negative in KEYBOARD_OPEN', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({
            currentState: InputContainerStateType.KEYBOARD_OPEN,
            tabBarHeight: 49,
            safeAreaBottom: 34,
        });

        // tabBarAdjustment=83, rawKeyboardHeight=50 → 50 <= 83 → effectiveHeight=0
        const result = calculateKeyboardUpdates(snapshot, 50, 50);
        expect(result.postInputTranslateY).toEqual({value: 0, animated: false});
    });

    it('should use adjustedHeight for EMOJI_PICKER_OPEN state (no constant subtraction)', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({
            currentState: InputContainerStateType.EMOJI_PICKER_OPEN,
            tabBarHeight: 49,
            safeAreaBottom: 34,
        });

        // adjustedHeight=250, rawKeyboardHeight=260 → |250-260|=10 ≤ 50
        // needsConstantSubtraction=false → effectiveHeight=adjustedHeight=250
        const result = calculateKeyboardUpdates(snapshot, 250, 260);
        expect(result.postInputTranslateY).toEqual({value: 250, animated: false});
    });
});

describe('getEmojiSearchActiveHeight', () => {
    it('should compute height without edge-to-edge using SEARCH_CONTAINER_PADDING as offset', () => {
        // offset=8 → (56+8+8+50+49)-34 = 171-34 = 137
        expect(getEmojiSearchActiveHeight(49, 34)).toBe(137);
    });

    it('should handle zero tabBarHeight and safeAreaBottom', () => {
        // offset=8 → (56+8+8+50+0)-0 = 122
        expect(getEmojiSearchActiveHeight(0, 0)).toBe(122);
    });
});

describe('calculateSearchHeight', () => {
    it('should return keyboardHeight + getEmojiSearchActiveHeight', () => {
        // getEmojiSearchActiveHeight(49, 34) = 137 (non-edge-to-edge)
        // keyboardHeight=336 → 336 + 137 = 473
        expect(calculateSearchHeight(336, 49, 34)).toBe(473);
    });

    it('should work with zero keyboard height', () => {
        // getEmojiSearchActiveHeight(0, 0) = 122
        // keyboardHeight=0 → 0 + 122 = 122
        expect(calculateSearchHeight(0, 0, 0)).toBe(122);
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import {KeyboardController} from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useIsTablet} from '@hooks/device';

import {useKeyboardAnimation} from './keyboardAnimation';
import {useKeyboardAwarePostDraft} from './useKeyboardAwarePostDraft';
import {useKeyboardScrollAdjustment} from './useKeyboardScrollAdjustment';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
}));

jest.mock('react-native-keyboard-controller', () => ({
    KeyboardController: {
        dismiss: jest.fn(() => Promise.resolve()),
    },
}));

jest.mock('react-native-reanimated', () => {
    const sharedValues = new Map();

    return {
        ...jest.requireActual('react-native-reanimated/mock'),
        useSharedValue: jest.fn((initial) => {
            const key = Math.random();
            const sv = {
                value: initial,
                _key: key,
            };
            sharedValues.set(key, sv);
            return sv;
        }),
        useDerivedValue: jest.fn((fn) => ({
            value: fn(),
        })),
        useAnimatedStyle: jest.fn((fn) => fn()),
        useAnimatedScrollHandler: jest.fn((handlers) => (event: {contentOffset: {y: number}}) => {
            if (handlers.onScroll) {
                handlers.onScroll(event);
            }
        }),
        useAnimatedReaction: jest.fn(),
    };
});

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: jest.fn(),
}));

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(),
}));

jest.mock('./keyboardAnimation', () => ({
    useKeyboardAnimation: jest.fn(),
}));

jest.mock('./useKeyboardScrollAdjustment', () => ({
    useKeyboardScrollAdjustment: jest.fn(),
}));

describe('useKeyboardAwarePostDraft', () => {
    const mockUseKeyboardAnimation = useKeyboardAnimation as jest.Mock;
    const mockUseKeyboardScrollAdjustment = useKeyboardScrollAdjustment as jest.Mock;
    const mockUseIsTablet = useIsTablet as jest.Mock;
    const mockUseSafeAreaInsets = useSafeAreaInsets as jest.Mock;
    const mockKeyboardControllerDismiss = KeyboardController.dismiss as jest.Mock;

    const mockKeyboardAnimationReturn = {
        height: {value: 0},
        inset: {value: 0},
        offset: {value: 0},
        scroll: {value: 0},
        onScroll: jest.fn(),
        isKeyboardFullyOpen: {value: false},
        isKeyboardFullyClosed: {value: true},
        isKeyboardInTransition: {value: false},
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseIsTablet.mockReturnValue(false);
        mockUseSafeAreaInsets.mockReturnValue({bottom: 0, top: 0, left: 0, right: 0});
        mockUseKeyboardAnimation.mockReturnValue(mockKeyboardAnimationReturn);
        mockUseKeyboardScrollAdjustment.mockImplementation(() => {});
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            const {result} = renderHook(() => useKeyboardAwarePostDraft());

            expect(result.current.postInputContainerHeight).toBe(91);
            expect(result.current.listRef.current).toBeNull();
            expect(result.current.inputRef.current).toBeUndefined();
            expect(result.current.height).toBe(mockKeyboardAnimationReturn.height);
            expect(result.current.contentInset).toBe(mockKeyboardAnimationReturn.inset);
            expect(result.current.onScroll).toBe(mockKeyboardAnimationReturn.onScroll);
            expect(result.current.blurInput).toBeDefined();
            expect(result.current.focusInput).toBeDefined();
            expect(result.current.blurAndDismissKeyboard).toBeDefined();
        });

        it('should call useKeyboardAnimation with correct parameters', () => {
            renderHook(() => useKeyboardAwarePostDraft(false, true));

            expect(mockUseKeyboardAnimation).toHaveBeenCalledWith(
                91, // DEFAULT_POST_INPUT_HEIGHT
                true, // isIOS
                false, // isTablet
                0, // insets.bottom
                false, // isThreadView
                true, // enabled
            );
        });

        it('should call useKeyboardScrollAdjustment with correct parameters', () => {
            const {result} = renderHook(() => useKeyboardAwarePostDraft());

            expect(mockUseKeyboardScrollAdjustment).toHaveBeenCalledWith(
                result.current.listRef,
                mockKeyboardAnimationReturn.scroll,
                mockKeyboardAnimationReturn.offset,
                true, // isIOS
            );
        });
    });

    describe('isThreadView parameter', () => {
        it('should pass isThreadView=true to useKeyboardAnimation', () => {
            renderHook(() => useKeyboardAwarePostDraft(true));

            expect(mockUseKeyboardAnimation).toHaveBeenCalledWith(
                91,
                true,
                false,
                0,
                true, // isThreadView
                true,
            );
        });
    });

    describe('enabled parameter', () => {
        it('should pass enabled=false to useKeyboardAnimation', () => {
            renderHook(() => useKeyboardAwarePostDraft(false, false));

            expect(mockUseKeyboardAnimation).toHaveBeenCalledWith(
                91,
                true,
                false,
                0,
                false,
                false, // enabled
            );
        });
    });

    describe('postInputContainerHeight', () => {
        it('should update postInputContainerHeight when setPostInputContainerHeight is called', () => {
            const {result} = renderHook(() => useKeyboardAwarePostDraft());

            act(() => {
                result.current.setPostInputContainerHeight(150);
            });

            expect(result.current.postInputContainerHeight).toBe(150);
        });

        it('should update postInputContainerHeight state', () => {
            const {result} = renderHook(() => useKeyboardAwarePostDraft());

            act(() => {
                result.current.setPostInputContainerHeight(150);
            });

            expect(result.current.postInputContainerHeight).toBe(150);
        });
    });

    describe('input ref callbacks', () => {
        it('should call blur on inputRef when blurInput is called', () => {
            const {result} = renderHook(() => useKeyboardAwarePostDraft());
            const mockBlur = jest.fn();

            // @ts-expect-error Test mock - only need blur method
            result.current.inputRef.current = {blur: mockBlur};

            act(() => {
                result.current.blurInput();
            });

            expect(mockBlur).toHaveBeenCalled();
        });

        it('should not throw when blurInput is called without inputRef', () => {
            const {result} = renderHook(() => useKeyboardAwarePostDraft());

            expect(() => {
                act(() => {
                    result.current.blurInput();
                });
            }).not.toThrow();
        });

        it('should call focus on inputRef when focusInput is called', () => {
            const {result} = renderHook(() => useKeyboardAwarePostDraft());
            const mockFocus = jest.fn();

            // @ts-expect-error Test mock - only need focus method
            result.current.inputRef.current = {focus: mockFocus};

            act(() => {
                result.current.focusInput();
            });

            expect(mockFocus).toHaveBeenCalled();
        });

        it('should not throw when focusInput is called without inputRef', () => {
            const {result} = renderHook(() => useKeyboardAwarePostDraft());

            expect(() => {
                act(() => {
                    result.current.focusInput();
                });
            }).not.toThrow();
        });
    });

    describe('blurAndDismissKeyboard', () => {
        it('should reset shared values and dismiss keyboard', async () => {
            const mockHeight = {value: 300};
            const mockInset = {value: 300};
            const mockOffset = {value: 300};
            const mockBlur = jest.fn();

            mockUseKeyboardAnimation.mockReturnValue({
                ...mockKeyboardAnimationReturn,
                height: mockHeight,
                inset: mockInset,
                offset: mockOffset,
            });

            const {result} = renderHook(() => useKeyboardAwarePostDraft());

            // @ts-expect-error Test mock - only need blur method
            result.current.inputRef.current = {blur: mockBlur};

            await act(async () => {
                await result.current.blurAndDismissKeyboard();
            });

            expect(mockHeight.value).toBe(0);
            expect(mockInset.value).toBe(0);
            expect(mockOffset.value).toBe(0);
            expect(mockBlur).toHaveBeenCalled();
            expect(mockKeyboardControllerDismiss).toHaveBeenCalled();
        });

        it('should handle missing inputRef gracefully', async () => {
            const mockHeight = {value: 300};
            const mockInset = {value: 300};
            const mockOffset = {value: 300};

            mockUseKeyboardAnimation.mockReturnValue({
                ...mockKeyboardAnimationReturn,
                height: mockHeight,
                inset: mockInset,
                offset: mockOffset,
            });

            const {result} = renderHook(() => useKeyboardAwarePostDraft());

            await act(async () => {
                await result.current.blurAndDismissKeyboard();
            });

            expect(mockHeight.value).toBe(0);
            expect(mockInset.value).toBe(0);
            expect(mockOffset.value).toBe(0);
            expect(mockKeyboardControllerDismiss).toHaveBeenCalled();
        });
    });

    describe('inputContainerAnimatedStyle', () => {
        it('should return animated style with translateY on iOS', () => {
            const mockHeight = {value: 200};
            mockUseKeyboardAnimation.mockReturnValue({
                ...mockKeyboardAnimationReturn,
                height: mockHeight,
            });

            const {result} = renderHook(() => useKeyboardAwarePostDraft());

            const style = result.current.inputContainerAnimatedStyle;
            expect(style).toEqual({
                transform: [{translateY: -200}],
            });
        });
    });

    describe('tablet and safe area handling', () => {
        it('should pass tablet and safe area values to useKeyboardAnimation', () => {
            mockUseIsTablet.mockReturnValue(true);
            mockUseSafeAreaInsets.mockReturnValue({bottom: 20, top: 0, left: 0, right: 0});

            renderHook(() => useKeyboardAwarePostDraft());

            expect(mockUseKeyboardAnimation).toHaveBeenCalledWith(
                91,
                true,
                true, // isTablet
                20, // insets.bottom
                false,
                true,
            );
        });
    });

    describe('return values', () => {
        it('should return all expected properties', () => {
            const {result} = renderHook(() => useKeyboardAwarePostDraft());

            expect(result.current).toHaveProperty('height');
            expect(result.current).toHaveProperty('listRef');
            expect(result.current).toHaveProperty('inputRef');
            expect(result.current).toHaveProperty('contentInset');
            expect(result.current).toHaveProperty('onScroll');
            expect(result.current).toHaveProperty('postInputContainerHeight');
            expect(result.current).toHaveProperty('setPostInputContainerHeight');
            expect(result.current).toHaveProperty('inputContainerAnimatedStyle');
            expect(result.current).toHaveProperty('keyboardHeight');
            expect(result.current).toHaveProperty('offset');
            expect(result.current).toHaveProperty('scroll');
            expect(result.current).toHaveProperty('blurInput');
            expect(result.current).toHaveProperty('focusInput');
            expect(result.current).toHaveProperty('blurAndDismissKeyboard');
            expect(result.current).toHaveProperty('isKeyboardFullyOpen');
            expect(result.current).toHaveProperty('isKeyboardFullyClosed');
            expect(result.current).toHaveProperty('isKeyboardInTransition');
        });

        it('should return keyboardHeight as alias for height', () => {
            const {result} = renderHook(() => useKeyboardAwarePostDraft());

            expect(result.current.keyboardHeight).toBe(result.current.height);
        });
    });
});


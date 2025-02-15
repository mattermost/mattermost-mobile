// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import {BehaviorSubject} from 'rxjs';

import {
    selectEmojiCategoryBarSection,
    setEmojiCategoryBarSection,
    setEmojiCategoryBarIcons,
    setEmojiSkinTone,
    useEmojiCategoryBar,
    useEmojiSkinTone,
} from './emoji_category_bar';

describe('EmojiCategoryBar', () => {
    const mockSubject = {
        next: jest.fn(),
        value: {
            icons: undefined,
            currentIndex: 0,
            selectedIndex: undefined,
            skinTone: 'default',
        },
        subscribe: jest.fn().mockImplementation((callback) => {
            callback(mockSubject.value);
            return {unsubscribe: jest.fn()};
        }),
    };

    beforeEach(() => {
        jest.spyOn(BehaviorSubject.prototype, 'next').mockImplementation(mockSubject.next);
        jest.spyOn(BehaviorSubject.prototype, 'subscribe').mockImplementation(mockSubject.subscribe);
        jest.spyOn(BehaviorSubject.prototype, 'value', 'get').mockReturnValue(mockSubject.value);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('setEmojiSkinTone', () => {
        it('should update the skin tone in the state', () => {
            setEmojiSkinTone('light');

            expect(mockSubject.next).toHaveBeenCalledWith({
                ...mockSubject.value,
                skinTone: 'light',
            });
        });
    });

    describe('useEmojiSkinTone', () => {
        it('should return the current skin tone', () => {
            const {result} = renderHook(() => useEmojiSkinTone());

            expect(result.current).toBe('default');
        });

        it('should update the skin tone when it changes', () => {
            const {result} = renderHook(() => useEmojiSkinTone());

            act(() => {
                mockSubject.subscribe.mock.calls[0][0]({skinTone: 'dark'});
            });

            expect(result.current).toBe('dark');
        });
    });

    describe('selectEmojiCategoryBarSection', () => {
        it('should update the selected index in the state', () => {
            selectEmojiCategoryBarSection(1);

            expect(mockSubject.next).toHaveBeenCalledWith({
                ...mockSubject.value,
                selectedIndex: 1,
            });
        });
    });

    describe('setEmojiCategoryBarSection', () => {
        it('should update the current index in the state', () => {
            setEmojiCategoryBarSection(1);

            expect(mockSubject.next).toHaveBeenCalledWith({
                ...mockSubject.value,
                currentIndex: 1,
            });
        });
    });

    describe('setEmojiCategoryBarIcons', () => {
        it('should update the icons in the state', () => {
            const icons = [{key: 'smile', name: 'smile', icon: 'smile'}];
            setEmojiCategoryBarIcons(icons);

            expect(mockSubject.next).toHaveBeenCalledWith({
                ...mockSubject.value,
                icons,
            });
        });
    });

    describe('useEmojiCategoryBar', () => {
        it('should return the current state', () => {
            const {result} = renderHook(() => useEmojiCategoryBar());

            expect(result.current).toEqual(mockSubject.value);
        });

        it('should update the state when it changes', () => {
            const {result} = renderHook(() => useEmojiCategoryBar());

            const newState = {
                icons: [{name: 'smile', icon: 'smile'}],
                currentIndex: 1,
                selectedIndex: 2,
                skinTone: 'dark',
            };

            act(() => {
                mockSubject.subscribe.mock.calls[0][0](newState);
            });

            expect(result.current).toEqual(newState);
        });
    });
});

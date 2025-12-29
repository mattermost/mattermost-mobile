// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {deleteLastGrapheme} from './grapheme';

describe('deleteLastGrapheme', () => {
    describe('Simple ASCII characters', () => {
        it('should delete a single character', () => {
            const result = deleteLastGrapheme('Hello', 5);
            expect(result.text).toBe('Hell');
            expect(result.cursorPosition).toBe(4);
        });

        it('should delete character in the middle', () => {
            const result = deleteLastGrapheme('Hello World', 5);
            expect(result.text).toBe('Hell World');
            expect(result.cursorPosition).toBe(4);
        });

        it('should delete character at the start', () => {
            const result = deleteLastGrapheme('Hello', 1);
            expect(result.text).toBe('ello');
            expect(result.cursorPosition).toBe(0);
        });
    });

    describe('Basic emojis', () => {
        it('should delete a simple emoji', () => {
            const result = deleteLastGrapheme('Hello 😀', 8);
            expect(result.text).toBe('Hello ');
            expect(result.cursorPosition).toBe(6);
        });

        it('should delete emoji in the middle', () => {
            const result = deleteLastGrapheme('😀 World', 2);
            expect(result.text).toBe(' World');
            expect(result.cursorPosition).toBe(0);
        });

        it('should delete emoji at the start', () => {
            const result = deleteLastGrapheme('😀 Hello', 2);
            expect(result.text).toBe(' Hello');
            expect(result.cursorPosition).toBe(0);
        });

        it('should delete multiple emojis correctly', () => {
            const result = deleteLastGrapheme('😀❤️🎉', 6);
            expect(result.text).toBe('😀❤️');
            expect(result.cursorPosition).toBe(4);
        });
    });

    describe('Complex Unicode characters', () => {
        it('should delete flag emoji (🇺🇸)', () => {
            const result = deleteLastGrapheme('Hello 🇺🇸', 10);
            expect(result.text).toBe('Hello ');
            expect(result.cursorPosition).toBe(6);
        });

        it('should delete flag emoji at start', () => {
            const result = deleteLastGrapheme('🇺🇸 Hello', 4);
            expect(result.text).toBe(' Hello');
            expect(result.cursorPosition).toBe(0);
        });

        it('should delete family emoji (👨‍👩‍👧‍👦)', () => {
            const result = deleteLastGrapheme('Family 👨‍👩‍👧‍👦', 18);
            expect(result.text).toBe('Family ');
            expect(result.cursorPosition).toBe(7);
        });

        it('should delete emoji with skin tone modifier (👨🏿)', () => {
            const result = deleteLastGrapheme('Hello 👨🏿', 10);
            expect(result.text).toBe('Hello ');
            expect(result.cursorPosition).toBe(6);
        });

        it('should delete emoji with zero-width joiner', () => {
            const result = deleteLastGrapheme('👨‍👩‍👧‍👦', 11);
            expect(result.text).toBe('');
            expect(result.cursorPosition).toBe(0);
        });
    });

    describe('Mixed text and emojis', () => {
        it('should delete emoji from mixed content', () => {
            const result = deleteLastGrapheme('Hello 😀 World', 8);
            expect(result.text).toBe('Hello  World');
            expect(result.cursorPosition).toBe(6);
        });

        it('should delete text character before emoji', () => {
            const result = deleteLastGrapheme('Hello😀', 5);
            expect(result.text).toBe('Hell😀');
            expect(result.cursorPosition).toBe(4);
        });

        it('should delete emoji between text', () => {
            const result = deleteLastGrapheme('Hello 😀 World', 8);
            expect(result.text).toBe('Hello  World');
            expect(result.cursorPosition).toBe(6);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty string', () => {
            const result = deleteLastGrapheme('', 0);
            expect(result.text).toBe('');
            expect(result.cursorPosition).toBe(0);
        });

        it('should handle cursor at start', () => {
            const result = deleteLastGrapheme('Hello', 0);
            expect(result.text).toBe('Hello');
            expect(result.cursorPosition).toBe(0);
        });

        it('should handle cursor beyond text length', () => {
            const result = deleteLastGrapheme('Hello', 10);
            expect(result.text).toBe('Hell');
            expect(result.cursorPosition).toBe(4);
        });

        it('should handle single character', () => {
            const result = deleteLastGrapheme('H', 1);
            expect(result.text).toBe('');
            expect(result.cursorPosition).toBe(0);
        });

        it('should handle single emoji', () => {
            const result = deleteLastGrapheme('😀', 2);
            expect(result.text).toBe('');
            expect(result.cursorPosition).toBe(0);
        });

        it('should handle only whitespace', () => {
            const result = deleteLastGrapheme('   ', 2);
            expect(result.text).toBe('  ');
            expect(result.cursorPosition).toBe(1);
        });
    });

    describe('Real-world scenarios', () => {
        it('should handle message with emojis', () => {
            const result = deleteLastGrapheme('Great job! 🎉👏', 15);
            expect(result.text).toBe('Great job! 🎉');
            expect(result.cursorPosition).toBe(13);
        });

        it('should handle message with flag', () => {
            const result = deleteLastGrapheme('From 🇺🇸', 9);
            expect(result.text).toBe('From ');
            expect(result.cursorPosition).toBe(5);
        });

        it('should handle message with mixed content', () => {
            const result = deleteLastGrapheme('Hello 👨‍👩‍👧‍👦 family!', 17);
            expect(result.text).toBe('Hello  family!');
            expect(result.cursorPosition).toBe(6);
        });
    });
});


// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from '@constants';

import {
    getStatusColors,
    isMessageAttachmentArray,
    testExports,
} from './message_attachment';

const {isMessageAttachment, isMessageAttachmentField, isPostAction, isPostActionOption} = testExports;

describe('getStatusColors', () => {
    const mockTheme = Preferences.THEMES.denim;

    test('returns correct status colors based on theme', () => {
        const expectedColors: Dictionary<string> = {
            good: '#00c100',
            warning: '#dede01',
            danger: '#d24b4e',
            default: '#3f4350',
            primary: '#1c58d9',
            success: '#3db887',
        };

        const statusColors = getStatusColors(mockTheme);
        expect(statusColors).toEqual(expectedColors);
    });

    test('returns the correct danger color from the theme', () => {
        const statusColors = getStatusColors(mockTheme);
        expect(statusColors.danger).toBe(mockTheme.errorTextColor);
    });

    test('returns the correct default color from the theme', () => {
        const statusColors = getStatusColors(mockTheme);
        expect(statusColors.default).toBe(mockTheme.centerChannelColor);
    });

    test('returns the correct primary color from the theme', () => {
        const statusColors = getStatusColors(mockTheme);
        expect(statusColors.primary).toBe(mockTheme.buttonBg);
    });

    test('returns the correct success color from the theme', () => {
        const statusColors = getStatusColors(mockTheme);
        expect(statusColors.success).toBe(mockTheme.onlineIndicator);
    });
});

describe('isPostActionOption', () => {
    test('returns true for a valid PostActionOption object', () => {
        const validOption = {text: 'text', value: 'value'};
        expect(isPostActionOption(validOption)).toBe(true);
    });

    test('returns false for a non-string text', () => {
        const invalidOption = {text: 123, value: 'value'};
        expect(isPostActionOption(invalidOption)).toBe(false);
    });

    test('returns false for a non-string value', () => {
        const invalidOption = {text: 'text', value: 123};
        expect(isPostActionOption(invalidOption)).toBe(false);
    });

    test('returns false for non-object input', () => {
        const nonObjectInput = 'invalid';
        expect(isPostActionOption(nonObjectInput)).toBe(false);
    });
});

describe('isPostAction', () => {
    test('returns true for a valid PostAction object', () => {
        const validPostAction = {id: 'id', name: 'name'};
        expect(isPostAction(validPostAction)).toBe(true);
    });

    test('returns false for a non-string id', () => {
        const invalidPostAction = {id: 123, name: 'name'};
        expect(isPostAction(invalidPostAction)).toBe(false);
    });

    test('returns false for a non-string name', () => {
        const invalidPostAction = {id: 'id', name: 123};
        expect(isPostAction(invalidPostAction)).toBe(false);
    });

    test('returns false for non-object input', () => {
        const nonObjectInput = 'invalid';
        expect(isPostAction(nonObjectInput)).toBe(false);
    });

    test('returns false for wrong id type', () => {
        const invalidPostAction = {id: {}, name: 'name'};
        expect(isPostAction(invalidPostAction)).toBe(false);
    });

    test('returns false for wrong name type', () => {
        const invalidPostAction = {id: 'id', name: {}};
        expect(isPostAction(invalidPostAction)).toBe(false);
    });

    test('returns false for invalid type', () => {
        const invalidPostAction = {id: 'id', name: 'name', type: 123};
        expect(isPostAction(invalidPostAction)).toBe(false);
    });

    test('returns false for invalid disabled', () => {
        const invalidPostAction = {id: 'id', name: 'name', disabled: 'true'};
        expect(isPostAction(invalidPostAction)).toBe(false);
    });

    test('returns false for invalid style', () => {
        const invalidPostAction = {id: 'id', name: 'name', style: 123};
        expect(isPostAction(invalidPostAction)).toBe(false);
    });

    test('returns false for invalid data_source', () => {
        const invalidPostAction = {id: 'id', name: 'name', data_source: 123};
        expect(isPostAction(invalidPostAction)).toBe(false);
    });

    test('returns false for invalid options', () => {
        const invalidPostAction = {id: 'id', name: 'name', options: 'invalid'};
        expect(isPostAction(invalidPostAction)).toBe(false);
    });

    test('returns false for invalid default_option', () => {
        const invalidPostAction = {id: 'id', name: 'name', default_option: 123};
        expect(isPostAction(invalidPostAction)).toBe(false);
    });

    test('returns false for invalid cookie', () => {
        const invalidPostAction = {id: 'id', name: 'name', cookie: 123};
        expect(isPostAction(invalidPostAction)).toBe(false);
    });
});

describe('isMessageAttachmentField', () => {
    test('returns true for a valid MessageAttachmentField object', () => {
        const validField = {title: 'title', value: 'value', short: true};
        expect(isMessageAttachmentField(validField)).toBe(true);
    });

    test('returns false for an invalid MessageAttachmentField object', () => {
        let invalidField;
        expect(isMessageAttachmentField(invalidField)).toBe(false);
    });

    test('returns false for non-object input', () => {
        const nonObjectInput = 'invalid';
        expect(isMessageAttachmentField(nonObjectInput)).toBe(false);
    });

    test('returns false for non-string title', () => {
        const invalidField = {title: 123, value: 'value', short: true};
        expect(isMessageAttachmentField(invalidField)).toBe(false);
    });

    test('returns false for object value with no toString function', () => {
        const invalidField = {title: 'title', value: {toString: 123}, short: true};
        expect(isMessageAttachmentField(invalidField)).toBe(false);
    });

    test('returns false for invalid value', () => {
        const invalidField = {title: 'title', value: {toString: 123}, short: true};
        expect(isMessageAttachmentField(invalidField)).toBe(false);
    });

    test('returns false for invalid short', () => {
        const invalidField = {title: 'title', value: 'value', short: 'true'};
        expect(isMessageAttachmentField(invalidField)).toBe(false);
    });
});

describe('isMessageAttachment', () => {
    test('returns true for a valid MessageAttachment object', () => {
        const validAttachment = {
            fallback: 'fallback',
            color: 'color',
            pretext: 'pretext',
            author_name: 'author_name',
            author_link: 'author_link',
            author_icon: 'author_icon',
            title: 'title',
            title_link: 'title_link',
            text: 'text',
            image_url: 'image_url',
            thumb_url: 'thumb_url',
            footer: 'footer',
            footer_icon: 'footer_icon',
            fields: [{title: 'title', value: 'value', short: true}],
            actions: [{id: 'id', name: 'name'}],
        };
        expect(isMessageAttachment(validAttachment)).toBe(true);
    });

    test('returns false for a non-string author name', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 123};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for non-object input', () => {
        const nonObjectInput = 'invalid';
        expect(isMessageAttachment(nonObjectInput)).toBe(false);
    });

    test('returns false for non-string fallback', () => {
        const invalidAttachment = {color: 'color', pretext: 'pretext', author_name: 'author_name', fallback: 123};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid color', () => {
        const invalidAttachment = {fallback: 'fallback', color: 123, pretext: 'pretext', author_name: 'author_name'};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid pretext', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 123, author_name: 'author_name'};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid author_name', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 123};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid author_link', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 'author_name', author_link: 123};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid author_icon', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 'author_name', author_icon: 123};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid title', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 'author_name', title: 123};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid title_link', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 'author_name', title_link: 123};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid text', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 'author_name', text: 123};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid image_url', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 'author_name', image_url: 123};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid thumb_url', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 'author_name', thumb_url: 123};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid footer', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 'author_name', footer: 123};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid footer_icon', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 'author_name', footer_icon: 123};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid fields', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 'author_name', fields: 'invalid'};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });

    test('returns false for invalid actions', () => {
        const invalidAttachment = {fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 'author_name', actions: 'invalid'};
        expect(isMessageAttachment(invalidAttachment)).toBe(false);
    });
});

describe('isMessageAttachmentArray', () => {
    test('returns true for a valid MessageAttachment array', () => {
        const validArray = [{fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 'author_name'}];
        expect(isMessageAttachmentArray(validArray)).toBe(true);
    });

    test('returns false for an invalid MessageAttachment array', () => {
        const invalidArray = [{fallback: 'fallback', color: 'color', pretext: 'pretext', author_name: 123}];
        expect(isMessageAttachmentArray(invalidArray)).toBe(false);
    });

    test('returns false for non-array input', () => {
        const nonArrayInput = 'invalid';
        expect(isMessageAttachmentArray(nonArrayInput)).toBe(false);
    });
});

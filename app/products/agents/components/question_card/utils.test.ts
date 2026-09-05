// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {parseAnswerFromResult, parseQuestionArgs} from './utils';

describe('parseQuestionArgs', () => {
    const validArgs = {
        question: 'Which approach?',
        options: [
            {label: 'Option A'},
            {label: 'Option B', description: 'The safer one'},
        ],
    };

    it('should parse valid arguments with defaults (single-select, free-form enabled)', () => {
        const parsed = parseQuestionArgs(validArgs);

        expect(parsed).toEqual({
            question: 'Which approach?',
            options: [
                {label: 'Option A', description: undefined},
                {label: 'Option B', description: 'The safer one'},
            ],
            multiSelect: false,
            allowFreeForm: true,
        });
        expect(parsed?.options).toHaveLength(2);
    });

    it('should parse string-encoded JSON arguments', () => {
        const parsed = parseQuestionArgs(JSON.stringify(validArgs));

        expect(parsed?.question).toBe('Which approach?');
        expect(parsed?.options).toHaveLength(2);
    });

    it('should honor explicit multi_select true and allow_free_form false', () => {
        const parsed = parseQuestionArgs({...validArgs, multi_select: true, allow_free_form: false});

        expect(parsed?.multiSelect).toBe(true);
        expect(parsed?.allowFreeForm).toBe(false);
    });

    it('should return null for missing, empty, or malformed options', () => {
        expect(parseQuestionArgs({question: 'Q?'})).toBeNull();
        expect(parseQuestionArgs({question: 'Q?', options: []})).toBeNull();
        expect(parseQuestionArgs({question: 'Q?', options: [{label: ''}]})).toBeNull();
        expect(parseQuestionArgs({question: 'Q?', options: [{description: 'no label'}]})).toBeNull();
    });

    it('should return null for redacted or non-object arguments', () => {
        expect(parseQuestionArgs(null)).toBeNull();
        expect(parseQuestionArgs(undefined)).toBeNull();
        expect(parseQuestionArgs('not json at all')).toBeNull();
        expect(parseQuestionArgs({options: validArgs.options})).toBeNull();
    });
});

describe('parseAnswerFromResult', () => {
    it('should extract selected labels and custom text from a JSON result', () => {
        const answer = parseAnswerFromResult('{"selected":["Option A"],"custom":"my own idea"}');

        expect(answer.selected).toEqual(['Option A']);
        expect(answer.custom).toBe('my own idea');
    });

    it('should return an empty answer for missing or non-JSON results', () => {
        expect(parseAnswerFromResult(undefined)).toEqual({selected: [], custom: ''});
        expect(parseAnswerFromResult('User skipped the question')).toEqual({selected: [], custom: ''});
    });
});

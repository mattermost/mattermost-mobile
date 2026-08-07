// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {ToolCallStatus, type ToolCall} from '@agents/types';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import QuestionCard, {parseAnswerFromResult, parseQuestionArgs} from './index';

describe('parseQuestionArgs', () => {
    it('should parse a valid question and apply the server defaults', () => {
        const parsed = parseQuestionArgs({
            question: 'Pick one',
            options: [{label: 'A'}, {label: 'B', description: 'the second'}],
        });

        expect(parsed).toEqual({
            question: 'Pick one',
            options: [{label: 'A', description: undefined}, {label: 'B', description: 'the second'}],
            multiSelect: false,
            allowFreeForm: true,
        });
    });

    it('should honor explicit multi_select and allow_free_form flags', () => {
        const parsed = parseQuestionArgs({
            question: 'Pick many',
            options: [{label: 'A'}, {label: 'B'}],
            multi_select: true,
            allow_free_form: false,
        });

        expect(parsed?.multiSelect).toBe(true);
        expect(parsed?.allowFreeForm).toBe(false);
    });

    it('should return null for redacted or malformed arguments', () => {
        expect(parseQuestionArgs(null)).toBeNull();
        expect(parseQuestionArgs('not an object')).toBeNull();
        expect(parseQuestionArgs({question: 'q', options: []})).toBeNull();
        expect(parseQuestionArgs({question: 'q', options: [{label: ''}]})).toBeNull();
        expect(parseQuestionArgs({question: '', options: [{label: 'A'}]})).toBeNull();
    });
});

describe('parseAnswerFromResult', () => {
    it('should extract selections and custom text from the JSON result', () => {
        expect(parseAnswerFromResult('{"selected":["A","B"],"custom":"my own"}')).toEqual({
            selected: ['A', 'B'],
            custom: 'my own',
        });
    });

    it('should yield an empty answer for missing or non-JSON results', () => {
        expect(parseAnswerFromResult(undefined)).toEqual({selected: [], custom: ''});
        expect(parseAnswerFromResult('plain text result')).toEqual({selected: [], custom: ''});
    });
});

describe('QuestionCard', () => {
    const makeTool = (overrides: Partial<ToolCall> = {}): ToolCall => ({
        id: 'q1',
        name: 'AskUserQuestion',
        description: '',
        arguments: {question: 'Pick one', options: [{label: 'Alpha'}, {label: 'Beta'}]},
        status: ToolCallStatus.Pending,
        user_interaction: 'select',
        ...overrides,
    });

    const getBaseProps = (): ComponentProps<typeof QuestionCard> => ({
        tool: makeTool(),
        question: {
            question: 'Pick one',
            options: [{label: 'Alpha'}, {label: 'Beta', description: 'second choice'}],
            multiSelect: false,
            allowFreeForm: true,
        },
        isProcessing: false,
        canAnswer: true,
        onAnswer: jest.fn(),
        onSkip: jest.fn(),
    });

    it('should submit a single-select answer immediately on option tap', () => {
        const props = getBaseProps();
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<QuestionCard {...props}/>);

        // No Submit button in plain single-select mode.
        expect(queryByTestId('agents.question_card.q1.submit')).toBeNull();

        fireEvent.press(getByTestId('agents.question_card.q1.option.1'));

        expect(props.onAnswer).toHaveBeenCalledWith('q1', ['Beta'], '');
    });

    it('should require an explicit Submit for multi-select and pass every selection', () => {
        const props = getBaseProps();
        props.question = {...props.question, multiSelect: true};
        const {getByTestId} = renderWithIntlAndTheme(<QuestionCard {...props}/>);

        fireEvent.press(getByTestId('agents.question_card.q1.option.0'));
        fireEvent.press(getByTestId('agents.question_card.q1.option.1'));
        expect(props.onAnswer).not.toHaveBeenCalled();

        fireEvent.press(getByTestId('agents.question_card.q1.submit'));
        expect(props.onAnswer).toHaveBeenCalledWith('q1', ['Alpha', 'Beta'], '');
    });

    it('should expand the free-form input in place and submit typed text explicitly', () => {
        const props = getBaseProps();
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<QuestionCard {...props}/>);

        fireEvent.press(getByTestId('agents.question_card.q1.free_form.option'));
        const input = getByTestId('agents.question_card.q1.free_form.input');
        expect(input).toBeTruthy();

        // Submit appears once free-form is active but stays inert until text
        // is typed (whitespace does not count).
        fireEvent.press(getByTestId('agents.question_card.q1.submit'));
        expect(props.onAnswer).not.toHaveBeenCalled();

        fireEvent.changeText(input, '  my own answer  ');
        fireEvent.press(getByTestId('agents.question_card.q1.submit'));
        expect(props.onAnswer).toHaveBeenCalledWith('q1', [], 'my own answer');

        expect(queryByTestId('agents.question_card.q1.option.0')).toBeTruthy();
    });

    it('should not offer the free-form row when allow_free_form is false', () => {
        const props = getBaseProps();
        props.question = {...props.question, allowFreeForm: false};
        const {queryByTestId} = renderWithIntlAndTheme(<QuestionCard {...props}/>);

        expect(queryByTestId('agents.question_card.q1.free_form.option')).toBeNull();
    });

    it('should report a skip', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<QuestionCard {...props}/>);

        fireEvent.press(getByTestId('agents.question_card.q1.skip'));
        expect(props.onSkip).toHaveBeenCalledWith('q1');
    });

    it('should render the answered state read-only with the recorded selection highlighted', () => {
        const props = getBaseProps();
        props.tool = makeTool({status: ToolCallStatus.Success, result: '{"selected":["Alpha"]}'});
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<QuestionCard {...props}/>);

        expect(getByTestId('agents.question_card.q1.status.answered')).toBeTruthy();
        expect(queryByTestId('agents.question_card.q1.skip')).toBeNull();

        fireEvent.press(getByTestId('agents.question_card.q1.option.0'));
        expect(props.onAnswer).not.toHaveBeenCalled();
    });

    it('should render the skipped state', () => {
        const props = getBaseProps();
        props.tool = makeTool({status: ToolCallStatus.Rejected});
        const {getByTestId} = renderWithIntlAndTheme(<QuestionCard {...props}/>);

        expect(getByTestId('agents.question_card.q1.status.skipped')).toBeTruthy();
    });

    it('should show the waiting state for viewers who cannot answer', () => {
        const props = getBaseProps();
        props.canAnswer = false;
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<QuestionCard {...props}/>);

        expect(getByTestId('agents.question_card.q1.status.waiting')).toBeTruthy();
        expect(queryByTestId('agents.question_card.q1.skip')).toBeNull();
    });
});

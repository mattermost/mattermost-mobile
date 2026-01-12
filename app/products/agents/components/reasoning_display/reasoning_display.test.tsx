// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import ReasoningDisplay from './index';

// Mock LoadingSpinner with testID for easy querying
jest.mock('./loading_spinner', () => {
    const {View} = require('react-native');
    const MockLoadingSpinner = () => <View testID='loading-spinner'/>;
    MockLoadingSpinner.displayName = 'MockLoadingSpinner';
    return MockLoadingSpinner;
});

describe('ReasoningDisplay', () => {
    const getBaseProps = (): ComponentProps<typeof ReasoningDisplay> => ({
        reasoningSummary: 'I am thinking about the problem step by step...',
        isReasoningLoading: false,
    });

    describe('header rendering', () => {
        it('should render "Thinking" header text', () => {
            const props = getBaseProps();
            const {getByText} = renderWithIntlAndTheme(<ReasoningDisplay {...props}/>);

            expect(getByText('Thinking')).toBeTruthy();
        });

        it('should show loading spinner when isReasoningLoading is true', () => {
            const props = getBaseProps();
            props.isReasoningLoading = true;
            const {getByTestId} = renderWithIntlAndTheme(<ReasoningDisplay {...props}/>);

            // LoadingSpinner component should be present
            expect(getByTestId('loading-spinner')).toBeTruthy();
        });

        it('should not show loading spinner when isReasoningLoading is false', () => {
            const props = getBaseProps();
            props.isReasoningLoading = false;
            const {queryByTestId} = renderWithIntlAndTheme(<ReasoningDisplay {...props}/>);

            // LoadingSpinner component should not be present
            expect(queryByTestId('loading-spinner')).toBeNull();
        });
    });

    describe('expand/collapse', () => {
        it('should be collapsed by default', () => {
            const props = getBaseProps();
            const {queryByText} = renderWithIntlAndTheme(<ReasoningDisplay {...props}/>);

            // Reasoning text should not be visible when collapsed
            expect(queryByText('I am thinking about the problem step by step...')).toBeNull();
        });

        it('should expand when header pressed', () => {
            const props = getBaseProps();
            const {getByText} = renderWithIntlAndTheme(<ReasoningDisplay {...props}/>);

            fireEvent.press(getByText('Thinking'));

            // Reasoning text should now be visible
            expect(getByText('I am thinking about the problem step by step...')).toBeTruthy();
        });

        it('should collapse when header pressed again', () => {
            const props = getBaseProps();
            const {getByText, queryByText} = renderWithIntlAndTheme(<ReasoningDisplay {...props}/>);

            // Expand
            fireEvent.press(getByText('Thinking'));
            expect(getByText('I am thinking about the problem step by step...')).toBeTruthy();

            // Collapse
            fireEvent.press(getByText('Thinking'));
            expect(queryByText('I am thinking about the problem step by step...')).toBeNull();
        });
    });

    describe('reasoning content', () => {
        it('should render reasoning text when expanded', () => {
            const props = getBaseProps();
            props.reasoningSummary = 'Step 1: Analyze the input. Step 2: Process data.';
            const {getByText} = renderWithIntlAndTheme(<ReasoningDisplay {...props}/>);

            fireEvent.press(getByText('Thinking'));

            expect(getByText('Step 1: Analyze the input. Step 2: Process data.')).toBeTruthy();
        });

        it('should not render content area when reasoning is empty and expanded', () => {
            const props = getBaseProps();
            props.reasoningSummary = '';
            const {getByText, queryByText} = renderWithIntlAndTheme(<ReasoningDisplay {...props}/>);

            fireEvent.press(getByText('Thinking'));

            // Empty reasoning should not show any text content
            expect(queryByText('I am thinking')).toBeNull();
        });

        it('should handle long reasoning text', () => {
            const props = getBaseProps();
            props.reasoningSummary = 'A'.repeat(1000); // Long text
            const {getByText} = renderWithIntlAndTheme(<ReasoningDisplay {...props}/>);

            fireEvent.press(getByText('Thinking'));

            expect(getByText('A'.repeat(1000))).toBeTruthy();
        });
    });

    describe('loading state', () => {
        it('should show loading spinner while reasoning is being generated', () => {
            const props = getBaseProps();
            props.isReasoningLoading = true;
            props.reasoningSummary = 'Partial reasoning...';
            const {getByTestId} = renderWithIntlAndTheme(<ReasoningDisplay {...props}/>);

            expect(getByTestId('loading-spinner')).toBeTruthy();
        });

        it('should hide loading spinner when reasoning is complete', () => {
            const props = getBaseProps();
            props.isReasoningLoading = false;
            props.reasoningSummary = 'Complete reasoning summary.';
            const {queryByTestId} = renderWithIntlAndTheme(<ReasoningDisplay {...props}/>);

            expect(queryByTestId('loading-spinner')).toBeNull();
        });
    });
});

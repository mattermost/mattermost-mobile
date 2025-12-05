// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import AlertSvgComponent from '@components/illustrations/alert';
import ErrorSvgComponent from '@components/illustrations/error';
import SuccessSvgComponent from '@components/illustrations/success';
import {act, fireEvent, renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Summary from './summary';
import SummaryReport from './summary_report';

import type {SearchResult} from './types';

jest.mock('./summary_report');
jest.mocked(SummaryReport).mockImplementation(
    (props) => React.createElement('SummaryReport', {...props}),
);

jest.mock('@components/illustrations/success', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(SuccessSvgComponent).mockImplementation(
    () => React.createElement('SuccessSvgComponent', {testID: 'success-svg'}),
);

jest.mock('@components/illustrations/error', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ErrorSvgComponent).mockImplementation(
    () => React.createElement('ErrorSvgComponent', {testID: 'error-svg'}),
);

jest.mock('@components/illustrations/alert', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(AlertSvgComponent).mockImplementation(
    () => React.createElement('AlertSvgComponent', {testID: 'alert-svg'}),
);

describe('Summary', () => {
    const mockOnClose = jest.fn();
    const mockOnRetry = jest.fn();
    const mockOnBack = jest.fn();
    const mockSelectedIds: {[id: string]: SearchResult} = {
        'user-1': TestHelper.fakeUser({id: 'user-1', username: 'user1'}),
        'email-1': 'test@example.com',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function getBaseProps(): ComponentProps<typeof Summary> {
        return {
            result: {
                sent: [],
                notSent: [],
            },
            selectedIds: mockSelectedIds,
            onClose: mockOnClose,
            onRetry: mockOnRetry,
            onBack: mockOnBack,
            testID: 'invite.summary',
        };
    }

    it('renders success state correctly', () => {
        const result = {
            sent: [
                {userId: 'user-1', reason: 'Invited as a member'},
            ],
            notSent: [],
        };

        const props = getBaseProps();
        props.result = result;

        const {getByText, getByTestId} = renderWithIntl(
            <Summary {...props}/>,
        );

        expect(getByText(/invitation has been sent/)).toBeTruthy();
        expect(getByText('Done')).toBeTruthy();
        expect(getByTestId('success-svg')).toBeTruthy();
    });

    it('renders error state correctly', () => {
        const result = {
            sent: [],
            notSent: [],
        };
        const error = 'Something went wrong';

        const props = getBaseProps();
        props.result = result;
        props.error = error;

        const {getByText} = renderWithIntl(
            <Summary {...props}/>,
        );

        expect(getByText(/could not be sent successfully/)).toBeTruthy();
        expect(getByText(error)).toBeTruthy();
        expect(getByText('Go back')).toBeTruthy();
        expect(getByText('Try again')).toBeTruthy();
    });

    it('renders not sent state correctly', () => {
        const result = {
            sent: [],
            notSent: [
                {userId: 'user-1', reason: 'Already a member'},
            ],
        };

        const props = getBaseProps();
        props.result = result;

        const {getByText, getByTestId} = renderWithIntl(
            <Summary {...props}/>,
        );

        expect(getByText(/Invitation wasn’t sent/)).toBeTruthy();
        expect(getByTestId('error-svg')).toBeTruthy();
    });

    it('renders partial success state correctly', () => {
        const result = {
            sent: [
                {userId: 'user-1', reason: 'Invited as a member'},
            ],
            notSent: [
                {email: 'test@example.com', reason: 'Failed to send'},
            ],
        };

        const props = getBaseProps();
        props.result = result;

        const {getByText, getByTestId} = renderWithIntl(
            <Summary {...props}/>,
        );

        expect(getByText(/An invitation was not sent/)).toBeTruthy();
        expect(getByTestId('alert-svg')).toBeTruthy();
    });

    it('handles done button press', () => {
        const result = {
            sent: [
                {userId: 'user-1', reason: 'Invited as a member'},
            ],
            notSent: [],
        };

        const props = getBaseProps();
        props.result = result;

        const {getByText} = renderWithIntl(
            <Summary {...props}/>,
        );

        const doneButton = getByText('Done');
        act(() => {
            fireEvent.press(doneButton);
        });

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles retry button press', () => {
        const result = {
            sent: [],
            notSent: [],
        };
        const error = 'Something went wrong';

        const props = getBaseProps();
        props.result = result;
        props.error = error;

        const {getByText} = renderWithIntl(
            <Summary {...props}/>,
        );

        const retryButton = getByText('Try again');
        act(() => {
            fireEvent.press(retryButton);
        });

        expect(mockOnRetry).toHaveBeenCalled();
    });

    it('handles back button press', () => {
        const result = {
            sent: [],
            notSent: [],
        };
        const error = 'Something went wrong';

        const props = getBaseProps();
        props.result = result;
        props.error = error;

        const {getByText} = renderWithIntl(
            <Summary {...props}/>,
        );

        const backButton = getByText('Go back');
        act(() => {
            fireEvent.press(backButton);
        });

        expect(mockOnBack).toHaveBeenCalled();
    });

    it('renders summary reports for sent and not sent', () => {
        const result = {
            sent: [
                {userId: 'user-1', reason: 'Invited as a member'},
            ],
            notSent: [
                {email: 'test@example.com', reason: 'Failed to send'},
            ],
        };

        const props = getBaseProps();
        props.result = result;

        const {getAllByTestId} = renderWithIntl(
            <Summary {...props}/>,
        );

        const reports = getAllByTestId('invite.summary_report');
        expect(reports).toHaveLength(2);
    });
});

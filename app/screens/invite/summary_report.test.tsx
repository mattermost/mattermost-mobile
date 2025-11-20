// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import UserItem from '@components/user_item';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SummaryReport, {SummaryReportType} from './summary_report';
import TextItem from './text_item';

import type {SearchResult} from './types';

jest.mock('./text_item');
jest.mocked(TextItem).mockImplementation(
    (props) => React.createElement('TextItem', {...props}),
);

jest.mock('@components/user_item', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(UserItem).mockImplementation(
    (props) => React.createElement('UserItem', {...props}),
);

describe('SummaryReport', () => {
    const mockSelectedIds: {[id: string]: SearchResult} = {
        'user-1': TestHelper.fakeUser({id: 'user-1', username: 'user1'}),
        'email-1': 'test@example.com',
    };

    function getBaseProps(): ComponentProps<typeof SummaryReport> {
        return {
            type: SummaryReportType.SENT,
            invites: [],
            selectedIds: mockSelectedIds,
            testID: 'invite.summary_report',
        };
    }

    it('renders sent type correctly', () => {
        const invites = [
            {userId: 'user-1', reason: 'Invited as a member'},
        ];

        const props = getBaseProps();
        props.type = SummaryReportType.SENT;
        props.invites = invites;

        const {getByText, getByTestId} = renderWithIntl(
            <SummaryReport {...props}/>,
        );

        expect(getByText(/1 successful invitation/)).toBeTruthy();
        expect(getByTestId('invite.summary_report.sent')).toBeTruthy();
    });

    it('renders not sent type correctly', () => {
        const invites = [
            {userId: 'user-1', reason: 'Already a member'},
        ];

        const props = getBaseProps();
        props.type = SummaryReportType.NOT_SENT;
        props.invites = invites;

        const {getByText, getByTestId} = renderWithIntl(
            <SummaryReport {...props}/>,
        );

        expect(getByText(/1 invitation not sent/)).toBeTruthy();
        expect(getByTestId('invite.summary_report.not_sent')).toBeTruthy();
    });

    it('renders email invites correctly', () => {
        const invites = [
            {email: 'test@example.com', reason: 'An invitation email has been sent'},
        ];

        const props = getBaseProps();
        props.type = SummaryReportType.SENT;
        props.invites = invites;

        const {getByText} = renderWithIntl(
            <SummaryReport {...props}/>,
        );

        expect(getByText('An invitation email has been sent')).toBeTruthy();
    });

    it('renders multiple invites correctly', () => {
        const invites = [
            {userId: 'user-1', reason: 'Invited as a member'},
            {email: 'test@example.com', reason: 'An invitation email has been sent'},
        ];

        const props = getBaseProps();
        props.type = SummaryReportType.SENT;
        props.invites = invites;

        const {getByText} = renderWithIntl(
            <SummaryReport {...props}/>,
        );

        expect(getByText('Invited as a member')).toBeTruthy();
        expect(getByText('An invitation email has been sent')).toBeTruthy();
    });
});


// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import PermalinkError from '@screens/permalink/permalink_error';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

jest.mock('@components/markdown', () => {
    const {Text} = require('react-native');
    const MockMarkdown = ({value}: {value: string}) => (
        <Text testID='mock-markdown'>{value}</Text>
    );
    return MockMarkdown;
});

describe('PermalinkError', () => {
    const baseProps = {
        handleClose: jest.fn(),
        handleJoin: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('inaccessible message (notExist)', () => {
        it('should display "Message Not Found" title', () => {
            const error: PermalinkErrorType = {notExist: true};
            const {getByText} = renderWithIntlAndTheme(
                <PermalinkError
                    {...baseProps}
                    error={error}
                />,
            );

            expect(getByText('Message Not Found')).toBeTruthy();
        });

        it('should display the correct body text', () => {
            const error: PermalinkErrorType = {notExist: true};
            const {getByText} = renderWithIntlAndTheme(
                <PermalinkError
                    {...baseProps}
                    error={error}
                />,
            );

            expect(getByText('Permalink belongs to a deleted message or to a channel to which you do not have access.')).toBeTruthy();
        });
    });

    describe('unreachable message', () => {
        it('should display "Message Not Found" title', () => {
            const error: PermalinkErrorType = {unreachable: true};
            const {getByText} = renderWithIntlAndTheme(
                <PermalinkError
                    {...baseProps}
                    error={error}
                />,
            );

            expect(getByText('Message Not Found')).toBeTruthy();
        });

        it('should display the correct body text', () => {
            const error: PermalinkErrorType = {unreachable: true};
            const {getByText} = renderWithIntlAndTheme(
                <PermalinkError
                    {...baseProps}
                    error={error}
                />,
            );

            expect(getByText('Permalink belongs to a deleted message or to a channel to which you do not have access.')).toBeTruthy();
        });
    });

    describe('join public channel', () => {
        it('should display "Join channel" title', () => {
            const error: PermalinkErrorType = {channelName: 'test-channel', channelId: 'ch1'};
            const {getAllByText} = renderWithIntlAndTheme(
                <PermalinkError
                    {...baseProps}
                    error={error}
                />,
            );

            expect(getAllByText('Join channel').length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('join private channel', () => {
        it('should display "Join private channel" title', () => {
            const error: PermalinkErrorType = {privateChannel: true, channelName: 'private-channel', channelId: 'ch1'};
            const {getByText} = renderWithIntlAndTheme(
                <PermalinkError
                    {...baseProps}
                    error={error}
                />,
            );

            expect(getByText('Join private channel')).toBeTruthy();
        });
    });
});

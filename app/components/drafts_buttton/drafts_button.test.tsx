// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';
import {DeviceEventEmitter} from 'react-native';

import {switchToGlobalDrafts} from '@actions/local/draft';
import DraftsButton from '@components/drafts_buttton/drafts_button';
import {Events} from '@constants';
import {DRAFT} from '@constants/screens';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

jest.mock('@actions/local/draft', () => ({
    switchToGlobalDrafts: jest.fn(),
}));

describe('components/drafts_button/DraftsButton', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const baseProps = {
        draftsCount: 0,
        scheduledPostCount: 0,
        scheduledPostHasError: false,
        isActiveTab: true,
    };

    test('should show draft count when greater than 0', () => {
        const props: Parameters<typeof DraftsButton>[0] = {
            ...baseProps,
            draftsCount: 5,
            isActiveTab: true,
        };

        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <DraftsButton {...props}/>,
        );

        expect(getByTestId('channel_list.drafts.count')).toHaveTextContent('5');
        expect(queryByTestId('channel_list.scheduled_post.count')).toBeNull();
    });

    test('should show scheduled post count when greater than 0', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 3,
        };

        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <DraftsButton {...props}/>,
        );

        expect(getByTestId('channel_list.scheduled_post.count')).toHaveTextContent('3');
        expect(queryByTestId('channel_list.drafts.count')).toBeNull();
    });

    test('should show both drafts and scheduled post count when greater than 0', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 3,
            draftsCount: 5,
        };

        const {getByTestId} = renderWithIntlAndTheme(
            <DraftsButton {...props}/>,
        );

        expect(getByTestId('channel_list.drafts.count')).toHaveTextContent('5');
        expect(getByTestId('channel_list.scheduled_post.count')).toHaveTextContent('3');
    });

    test('should show both drafts and scheduled post count when greater than 0 and scheduled post has error', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 3,
            draftsCount: 5,
            scheduledPostHasError: true,
        };

        const {getByTestId} = renderWithIntlAndTheme(
            <DraftsButton {...props}/>,
        );

        expect(getByTestId('channel_list.drafts.count')).toHaveTextContent('5');
        expect(getByTestId('channel_list.scheduled_post.count')).toHaveTextContent('3');

        const countElement = getByTestId('channel_list.scheduled_post.count.container');
        expect(countElement).toBeVisible();
        expect(countElement).toHaveStyle({backgroundColor: expect.any(String)});
    });

    test('should apply error styles when scheduled post has error', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 1,
            scheduledPostHasError: true,
        };

        const {getByTestId} = renderWithIntlAndTheme(
            <DraftsButton {...props}/>,
        );

        const countElement = getByTestId('channel_list.scheduled_post.count.container');
        expect(countElement).toBeVisible();
        expect(countElement).toHaveStyle({backgroundColor: expect.any(String)});
    });

    test('should handle press and emit events', async () => {
        const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

        const {getByTestId} = renderWithIntlAndTheme(
            <DraftsButton {...baseProps}/>,
        );

        const button = getByTestId('channel_list.drafts.button');
        jest.mocked(switchToGlobalDrafts).mockResolvedValue({error: null});
        await act(async () => {
            fireEvent.press(button);
            await TestHelper.wait(0);
        });

        expect(switchToGlobalDrafts).toHaveBeenCalled();
        expect(emitSpy).toHaveBeenCalledWith(Events.ACTIVE_SCREEN, DRAFT);
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {fetchFinishedRunsForChannel} from '@playbooks/actions/remote/runs';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ShowMoreButton from './show_more_button';

jest.mock('@playbooks/actions/remote/runs');
jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'https://test.server.com'),
}));

describe('ShowMoreButton', () => {
    const mockFetchFinishedRunsForChannel = jest.mocked(fetchFinishedRunsForChannel);

    function getBaseProps(): ComponentProps<typeof ShowMoreButton> {
        return {
            channelId: 'test-channel-id',
            addMoreRuns: jest.fn(),
            visible: true,
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly when hasMore is true', () => {
        const props = getBaseProps();
        const {getByText} = renderWithIntl(<ShowMoreButton {...props}/>);

        const button = getByText('Show More');
        expect(button).toBeTruthy();
    });

    it('does not render when hasMore is false', async () => {
        const props = getBaseProps();
        mockFetchFinishedRunsForChannel.mockResolvedValueOnce({
            runs: [],
            has_more: false,
        });

        const {getByText, queryByText} = renderWithIntl(<ShowMoreButton {...props}/>);

        // Initially renders the button
        expect(getByText('Show More')).toBeTruthy();

        // Click the button to trigger the fetch
        await act(async () => {
            fireEvent.press(getByText('Show More'));
        });

        // Wait for the component to update and hide
        await waitFor(() => {
            expect(queryByText('Show More')).toBeNull();
        });
    });

    it('calls fetchFinishedRunsForChannel with correct parameters when button is pressed', async () => {
        const props = getBaseProps();
        mockFetchFinishedRunsForChannel.mockResolvedValueOnce({
            runs: [],
            has_more: true,
        });

        const {getByText} = renderWithIntl(<ShowMoreButton {...props}/>);

        await act(async () => {
            fireEvent.press(getByText('Show More'));
        });

        expect(mockFetchFinishedRunsForChannel).toHaveBeenCalledWith(
            'https://test.server.com',
            'test-channel-id',
            0,
        );
    });

    it('increments page number on subsequent calls', async () => {
        const props = getBaseProps();
        mockFetchFinishedRunsForChannel.
            mockResolvedValueOnce({
                runs: [],
                has_more: true,
            }).
            mockResolvedValueOnce({
                runs: [],
                has_more: true,
            });

        const {getByText} = renderWithIntl(<ShowMoreButton {...props}/>);

        // First click
        await act(async () => {
            fireEvent.press(getByText('Show More'));
        });

        expect(mockFetchFinishedRunsForChannel).toHaveBeenCalledWith(
            'https://test.server.com',
            'test-channel-id',
            0,
        );

        // Wait for DELAY before second click to simulate the double tap prevention
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 800)); // DELAY is 750ms
            fireEvent.press(getByText('Show More'));
        });

        expect(mockFetchFinishedRunsForChannel).toHaveBeenCalledWith(
            'https://test.server.com',
            'test-channel-id',
            1,
        );
    });

    it('calls addMoreRuns when runs are returned', async () => {
        const props = getBaseProps();
        const mockRuns = [
            TestHelper.fakePlaybookRun({id: 'run-1'}),
            TestHelper.fakePlaybookRun({id: 'run-2'}),
        ];
        mockFetchFinishedRunsForChannel.mockResolvedValueOnce({
            runs: mockRuns,
            has_more: true,
        });

        const {getByText} = renderWithIntl(<ShowMoreButton {...props}/>);

        await act(async () => {
            fireEvent.press(getByText('Show More'));
        });

        waitFor(() => {
            expect(props.addMoreRuns).toHaveBeenCalledWith(mockRuns);
        });
    });

    it('does not call addMoreRuns when no runs are returned', async () => {
        const props = getBaseProps();
        mockFetchFinishedRunsForChannel.mockResolvedValueOnce({
            runs: [],
            has_more: true,
        });

        const {getByText} = renderWithIntl(<ShowMoreButton {...props}/>);

        await act(async () => {
            fireEvent.press(getByText('Show More'));
        });

        waitFor(() => {
            expect(props.addMoreRuns).not.toHaveBeenCalled();
        });
    });

    it('sets hasMore to false when API returns an error', async () => {
        const props = getBaseProps();
        mockFetchFinishedRunsForChannel.mockResolvedValueOnce({
            error: new Error('API Error'),
        });

        const {getByText, queryByText} = renderWithIntl(<ShowMoreButton {...props}/>);

        await act(async () => {
            fireEvent.press(getByText('Show More'));
        });

        waitFor(() => {
            expect(queryByText('Show More')).toBeNull();
        });
    });

    it('updates runs and maintains hasMore when API returns runs with has_more true', async () => {
        const props = getBaseProps();
        const mockRuns = [TestHelper.fakePlaybookRun({id: 'run-1'})];
        mockFetchFinishedRunsForChannel.mockResolvedValueOnce({
            runs: mockRuns,
            has_more: true,
        });

        const {getByText} = renderWithIntl(<ShowMoreButton {...props}/>);

        await act(async () => {
            fireEvent.press(getByText('Show More'));
        });

        waitFor(() => {
            expect(props.addMoreRuns).toHaveBeenCalledWith(mockRuns);
            expect(getByText('Show More')).toBeTruthy(); // Button should still be visible
        });
    });

    it('does not render when visible is false', () => {
        const props = getBaseProps();
        props.visible = false;

        const {queryByText} = renderWithIntl(<ShowMoreButton {...props}/>);
        expect(queryByText('Show More')).toBeNull();
    });
});

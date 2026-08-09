// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {of} from 'rxjs';

import {Tutorial} from '@constants';
import DatabaseManager from '@database/manager';
import {observeTutorialWatched} from '@queries/app/global';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';

import SendButton from './send_button';

import EnhancedSendButton from './index';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@queries/app/global', () => ({
    observeTutorialWatched: jest.fn(),
}));

jest.mock('./send_button', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(SendButton).mockImplementation((props) => React.createElement('SendButton', {...props, testID: 'send-button'}));

describe('SendButton', () => {
    let testIndex = 0;
    let serverUrl: string;
    let database: Database;
    let unmount: () => void;

    beforeEach(async () => {
        serverUrl = `send-button-${testIndex++}.test.com`;
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
        jest.mocked(observeTutorialWatched).mockReturnValue(of(false));
    });

    afterEach(async () => {
        // Unmount before DB destruction so withObservables subscriptions are
        // torn down before the database emits a final completion, preventing
        // unwrapped state updates after the test ends.
        unmount?.();
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const defaultProps: Parameters<typeof EnhancedSendButton>[0] = {
        testID: 'send-button',
        disabled: false,
        sendMessage: jest.fn(),
        showScheduledPostOptions: jest.fn(),
        scheduledPostEnabled: true,
    };

    it('should return false if the scheduled post tutorial is not watched', async () => {
        const {getByTestId, unmount: u} = renderWithEverything(<EnhancedSendButton {...defaultProps}/>, {database});
        unmount = u;
        await waitFor(() => expect(getByTestId('send-button').props.scheduledPostFeatureTooltipWatched).toBe(false));
        expect(observeTutorialWatched).toHaveBeenCalledWith(Tutorial.SCHEDULED_POST);
    });

    it('should return true if the scheduled post tutorial is watched', async () => {
        jest.mocked(observeTutorialWatched).mockReturnValue(of(true));
        const {getByTestId, unmount: u} = renderWithEverything(<EnhancedSendButton {...defaultProps}/>, {database});
        unmount = u;
        await waitFor(() => expect(getByTestId('send-button').props.scheduledPostFeatureTooltipWatched).toBe(true));
    });
});

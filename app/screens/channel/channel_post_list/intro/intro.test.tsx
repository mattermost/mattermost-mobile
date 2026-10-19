// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React from 'react';

import EphemeralStore from '@store/ephemeral_store';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import Intro from './intro';

describe('Intro', () => {
    beforeEach(() => {
        enableFakeTimers();
    });

    afterEach(() => {
        disableFakeTimers();
        jest.restoreAllMocks();
    });

    it('should not show the loading indicator when posts finish loading between render and subscription', async () => {
        // The stop event fires before the listener exists, so only the store reflects it.
        jest.spyOn(EphemeralStore, 'isLoadingMessagesForChannel').
            mockReturnValueOnce(true).
            mockReturnValue(false);

        const {queryByTestId} = renderWithIntlAndTheme(<Intro roles={[]}/>);
        await act(() => advanceTimers(600));

        expect(queryByTestId('channel_post_list.intro.loading')).toBeNull();
    });
});

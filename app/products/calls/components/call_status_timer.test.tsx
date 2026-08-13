// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import {CallStatusTimer} from './call_status_timer';

describe('CallStatusTimer', () => {
    const now = new Date('2026-01-01T12:00:00Z').getTime();

    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.setSystemTime(now);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    function getBaseProps(): ComponentProps<typeof CallStatusTimer> {
        return {
            isCalling: false,
            value: now - 65000, // answered 1:05 ago
            style: {},
        };
    }

    it('should show the elapsed time since the call was answered', () => {
        const {getByText, queryByTestId} = renderWithIntl(<CallStatusTimer {...getBaseProps()}/>);

        expect(getByText('01:05')).toBeVisible();
        expect(queryByTestId('calls.calling_text')).toBeNull();
    });

    it('should show Calling instead of a duration while the call is still ringing', () => {
        const props = {...getBaseProps(), isCalling: true};
        const {getByTestId, queryByText} = renderWithIntl(<CallStatusTimer {...props}/>);

        expect(getByTestId('calls.calling_text')).toHaveTextContent('Calling...');
        expect(queryByText('01:05')).toBeNull();
    });
});

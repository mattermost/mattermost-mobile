// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import ScheduledPostEmptyComponent from './scheduled_post_empty_component';

describe('screens/global_drafts/components/ScheduledPostEmptyComponent', () => {
    it('renders all required elements', () => {
        const {getByTestId, getByText} = renderWithIntl(
            <ScheduledPostEmptyComponent/>,
        );

        // Verify component renders
        expect(getByTestId('scheduled_post_empty_component')).toBeTruthy();

        // Verify text elements
        expect(getByText('No scheduled drafts at the moment')).toBeTruthy();
        expect(getByText('Schedule drafts to send messages at a later time. Any scheduled drafts will show up here and can be modified after being scheduled.')).toBeTruthy();
    });
});

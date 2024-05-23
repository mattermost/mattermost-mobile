// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {useIsTablet} from '@hooks/device';
import {renderWithIntl} from '@test/intl-test-helper';

import PostPriorityPicker from './post_priority_picker';

jest.mock('@hooks/device');
const mockedIsTablet = jest.mocked(useIsTablet);

function getBaseProps(): ComponentProps<typeof PostPriorityPicker> {
    return {
        closeButtonId: '',
        componentId: 'BottomSheet',
        isPersistenNotificationsEnabled: true,
        isPostAcknowledgementEnabled: true,
        persistentNotificationInterval: 0,
        postPriority: {priority: ''},
        updatePostPriority: jest.fn(),
    };
}
describe('post_priority_picker', () => {
    it('correctly shows the apply and cancel buttons on mobile', async () => {
        mockedIsTablet.mockReturnValue(false);
        const props = getBaseProps();
        renderWithIntl(<PostPriorityPicker {...props}/>);
        expect(await screen.findByText('Apply')).toBeVisible();
        expect(await screen.findByText('Cancel')).toBeVisible();
    });

    it('correctly shows the apply and cancel buttons on tablet', async () => {
        mockedIsTablet.mockReturnValue(true);
        const props = getBaseProps();
        renderWithIntl(<PostPriorityPicker {...props}/>);
        expect(await screen.findByText('Apply')).toBeVisible();
        expect(await screen.findByText('Cancel')).toBeVisible();
    });
});

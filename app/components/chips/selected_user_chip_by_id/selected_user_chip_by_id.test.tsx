// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import SelectedUserChip from '@components/chips/selected_user_chip';
import {General} from '@constants';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SelectedUserChipById from './selected_user_chip_by_id';

// Mock the SelectedUserChip component
jest.mock('@components/chips/selected_user_chip', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(SelectedUserChip).mockImplementation((props) => React.createElement('SelectedUserChip', {...props}));

describe('SelectedUserChipById', () => {
    function getBaseProps(): ComponentProps<typeof SelectedUserChipById> {
        return {
            onPress: jest.fn(),
            teammateNameDisplay: General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME,
            testID: 'test-selected-user-chip',
        };
    }

    it('should render SelectedUserChip with correct props', () => {
        const user = TestHelper.fakeUserModel({id: 'user-123'});
        const props = getBaseProps();
        props.user = user;

        const {getByTestId} = renderWithIntl(
            <SelectedUserChipById {...props}/>,
        );

        const chip = getByTestId('test-selected-user-chip');
        expect(chip).toHaveProp('user', user);
        expect(chip).toHaveProp('onPress', props.onPress);
        expect(chip).toHaveProp('teammateNameDisplay', props.teammateNameDisplay);
    });

    it('should handle missing user', () => {
        const props = getBaseProps();

        const {queryByTestId} = renderWithIntl(
            <SelectedUserChipById {...props}/>,
        );

        expect(queryByTestId('test-selected-user-chip')).toBeNull();
    });
});

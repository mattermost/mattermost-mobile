// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';

import Preferences from '@mm-redux/constants/preferences';
import {renderWithReduxIntl} from '@test/testing_library';

import CustomStatusExpiry from './custom_status_expiry';

jest.mock('@mm-redux/selectors/entities/preferences');

jest.mock('@mm-redux/selectors/entities/preferences', () => ({
    getBool: jest.fn().mockReturnValue(false),
    isCollapsedThreadsEnabled: jest.fn(),
}));

describe('components/custom_status/custom_status_expiry', () => {
    const date = moment().endOf('day');

    const baseProps = {
        theme: Preferences.THEMES.denim,
        time: date.toDate(),
    };

    it('should match snapshot', () => {
        const wrapper = renderWithReduxIntl(
            <CustomStatusExpiry
                {...baseProps}
            />,
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
        expect(wrapper.getByText('Today')).toBeDefined();
    });

    it('should match snapshot with prefix and brackets', () => {
        const props = {
            ...baseProps,
            showPrefix: true,
            withinBrackets: true,
        };
        const wrapper = renderWithReduxIntl(
            <CustomStatusExpiry
                {...props}
            />,
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
        expect(wrapper.getByText('Until')).toBeDefined();
        expect(wrapper.getByText('Today')).toBeDefined();
    });

    it("should render Tomorrow if given tomorrow's date", () => {
        const props = {
            ...baseProps,
            time: moment().add(1, 'day').endOf('day').toDate(),
        };
        const wrapper = renderWithReduxIntl(
            <CustomStatusExpiry
                {...props}
            />,
        );
        expect(wrapper.getByText('Tomorrow')).toBeDefined();
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React from 'react';
import {IntlProvider} from 'react-intl';

export const IntlWrapper: React.FC = ({children}) => (
    <IntlProvider
        locale='en'
    >
        {children}
    </IntlProvider>
);

import EditChannelInfo from './index';

describe('EditChannelInfo', () => {
    const baseProps = {
        testID: 'edit_channel_info',
        channelType: 'O',
        enableRightButton: jest.fn(),
        saving: false,
        editing: false,
        error: '',
        displayName: {
            value: 'display_name',
            onChange: jest.fn(),
        },
        purpose: {
            value: 'purpose',
            onChange: jest.fn(),
        },
        header: {
            value: 'header',
            onChange: jest.fn(),
        },
        onTypeChange: jest.fn(),
        oldDisplayName: 'old_display_name',
        oldHeader: 'old_header',
        oldPurpose: 'old_purpose',
    };

    test('should match snapshot, create channel', () => {
        const {queryByText, toJSON} = render(
            <EditChannelInfo {...baseProps}/>,
            {wrapper: IntlWrapper},
        );
        expect(queryByText('Public Channel')).toBeTruthy();
        expect(queryByText('Private Channel')).toBeTruthy();
        expect(toJSON()).toMatchSnapshot();
    });

    test('should match snapshot, edit channel', () => {
        baseProps.editing = true;
        const {queryByText, toJSON} = render(
            <EditChannelInfo {...baseProps}/>,
            {wrapper: IntlWrapper},
        );
        expect(queryByText('Public Channel')).toBeFalsy();
        expect(queryByText('Private Channel')).toBeFalsy();
        expect(toJSON()).toMatchSnapshot();
    });
});

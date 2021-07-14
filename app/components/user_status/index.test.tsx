// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderWithIntl} from '@test/intl-test-helper';
import React from 'react';

import {General} from '@constants';

import UserStatus from './index';

describe('UserStatus', () => {
    const baseProps = {
        size: 32,
        status: 'away',
        userId: '323211232334',
    };

    test('should match snapshot, should default to offline status', () => {
        const wrapper = renderWithIntl(<UserStatus{...baseProps}/>);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    test('should match snapshot, away status', () => {
        const wrapper = renderWithIntl(
            <UserStatus
                {...baseProps}
                status={General.AWAY}
            />);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    test('should match snapshot, dnd status', () => {
        const wrapper = renderWithIntl(
            <UserStatus
                {...baseProps}
                status={General.DND}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    test('should match snapshot, online status', () => {
        const wrapper = renderWithIntl(
            <UserStatus
                {...baseProps}
                status={General.ONLINE}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});

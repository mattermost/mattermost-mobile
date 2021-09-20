// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {General} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import UserStatus from './';

describe('UserStatus', () => {
    const baseProps = {
        size: 32,
    };

    test('should match snapshot, should default to offline status', () => {
        const wrapper = renderWithIntlAndTheme(
            <UserStatus {...baseProps}/>,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    test('should match snapshot, away status', () => {
        const wrapper = renderWithIntlAndTheme(
            <UserStatus
                {...baseProps}
                status={General.AWAY}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    test('should match snapshot, dnd status', () => {
        const wrapper = renderWithIntlAndTheme(
            <UserStatus
                {...baseProps}
                status={General.DND}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    test('should match snapshot, online status', () => {
        const wrapper = renderWithIntlAndTheme(
            <UserStatus
                {...baseProps}
                status={General.ONLINE}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});

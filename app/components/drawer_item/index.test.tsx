// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntl} from '@test/intl-test-helper';

import DrawerItem from './';

describe('DrawerItem', () => {
    const baseProps = {
        onPress: () => null,
        testID: 'test-id',
        centered: true,
        defaultMessage: 'default message',
        i18nId: 'i18-id',
        iconName: 'icon-name',
        isDestructor: true,
        separator: true,
        theme: Preferences.THEMES.denim,
    };

    test('should match snapshot', () => {
        const wrapper = renderWithIntl(<DrawerItem {...baseProps}/>);

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    test('should match snapshot without separator and centered false', () => {
        const props = {
            ...baseProps,
            centered: false,
            separator: false,
        };
        const wrapper = renderWithIntl(
            <DrawerItem {...props}/>,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});

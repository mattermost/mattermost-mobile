// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from '@mm-redux/constants/preferences';

import DrawerItem from './drawer_item';
import {Text} from 'react-native';

describe('DrawerItem', () => {
    const baseProps = {
        onPress: jest.fn(),
        testID: 'test-id',
        centered: true,
        defaultMessage: 'default message',
        i18nId: 'i18-id',
        iconName: 'icon-name',
        isDestructor: true,
        separator: true,
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <DrawerItem {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot with label sibling element and centered and separator false', () => {
        const labelSibling = (
            <Text>{'Hey'}</Text>
        );
        const wrapper = shallowWithIntl(
            <DrawerItem
                {...baseProps}
                centered={false}
                separator={false}
                labelSibling={labelSibling}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});

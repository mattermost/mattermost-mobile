// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Preferences from '@mm-redux/constants/preferences';
import {CustomStatusDuration} from '@mm-redux/types/users';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {shallowWithIntl} from '@test/intl-test-helper';

import SettingsSidebar from './settings_sidebar.ios';

describe('SettingsSidebar', () => {
    const customStatus = {
        emoji: 'calendar',
        text: 'In a meeting',
        duration: CustomStatusDuration.DONT_CLEAR,
    };

    const baseProps = {
        actions: {
            logout: jest.fn(),
            setStatus: jest.fn(),
            unsetCustomStatus: jest.fn(),
        },
        currentUser: {
            id: 'user-id',
        },
        status: 'offline',
        theme: Preferences.THEMES.denim,
        isCustomStatusEnabled: false,
        isCustomStatusExpired: false,
        isCustomStatusExpirySupported: false,
        customStatus,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <SettingsSidebar {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    it('should match snapshot with custom status enabled', () => {
        const wrapper = shallowWithIntl(
            <SettingsSidebar
                {...baseProps}
                isCustomStatusEnabled={true}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    it('should match snapshot with custom status expiry', () => {
        const wrapper = shallowWithIntl(
            <SettingsSidebar
                {...baseProps}
                isCustomStatusEnabled={true}
                customStatus={{
                    ...customStatus,
                    duration: CustomStatusDuration.DATE_AND_TIME,
                    expires_at: '2200-04-13T18:09:12.451Z',
                }}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    describe('Custom Status', () => {
        const tests = [
            {case: 'should keep sidebar open when update custom status fails', error: 'update custom status fail'},
            {case: 'should close sidebar when update custom status succeeds', error: undefined},
        ];

        tests.forEach((test) => {
            it(test.case, () => {
                const wrapper = shallowWithIntl(
                    <SettingsSidebar
                        {...baseProps}
                        isCustomStatusEnabled={true}
                        customStatus={{
                            ...customStatus,
                            duration: CustomStatusDuration.DATE_AND_TIME,
                            expires_at: '2200-04-13T18:09:12.451Z',
                        }}
                    />,
                );

                const instance = wrapper.instance();
                instance.componentDidMount();

                const spy = jest.spyOn(instance, 'closeSettingsSidebar');

                EventEmitter.emit('set_custom_status', test.error);

                if (test.error) {
                    expect(spy).not.toBeCalled();
                    expect(wrapper.state('showRetryMessage')).toBe(true);
                } else {
                    expect(spy).toBeCalled();
                    expect(wrapper.state('showRetryMessage')).toBe(false);
                }

                expect(wrapper.getElement()).toMatchSnapshot();
            });
        });
    });
});

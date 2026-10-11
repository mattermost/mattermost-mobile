// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';
import React, {type ReactNode} from 'react';
import {IntlProvider} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {Events, Launch} from '@constants';
import {showDmGmAccessRevoked} from '@utils/navigation';

import {useHomeScreenEffects} from './use_home_effects';

import type {LaunchProps} from '@typings/launch';

jest.mock('@utils/navigation', () => ({
    alertChannelArchived: jest.fn(),
    alertChannelRemove: jest.fn(),
    alertTeamRemove: jest.fn(),
    showChannelAccessRevoked: jest.fn(),
    showDmGmAccessRevoked: jest.fn(),
}));

jest.mock('@actions/remote/user', () => ({
    autoUpdateTimezone: jest.fn(),
}));

jest.mock('@queries/app/servers', () => ({
    getAllServers: jest.fn().mockResolvedValue([]),
}));

jest.mock('@managers/security_manager', () => ({
    start: jest.fn(),
}));

const wrapper = ({children}: {children: ReactNode}) => (
    <IntlProvider locale='en'>{children}</IntlProvider>
);

const props = {launchType: Launch.Normal} as LaunchProps;

describe('useHomeScreenEffects', () => {
    it('should show the DM/GM access revoked sheet on the event, until unmounted', () => {
        const {unmount} = renderHook(() => useHomeScreenEffects(props), {wrapper});

        act(() => {
            DeviceEventEmitter.emit(Events.DM_GM_ACCESS_REVOKED);
        });
        expect(showDmGmAccessRevoked).toHaveBeenCalledTimes(1);

        unmount();
        DeviceEventEmitter.emit(Events.DM_GM_ACCESS_REVOKED);
        expect(showDmGmAccessRevoked).toHaveBeenCalledTimes(1);
    });
});

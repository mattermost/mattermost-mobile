// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import SelectServer from './select_server.js';
import {shallowWithIntl} from 'test/intl-test-helper';

describe('SelectServer', () => {
    const actions = {
        getPing: jest.fn(),
        handleServerUrlChanged: jest.fn(),
        scheduleExpiredNotification: jest.fn(),
        loadConfigAndLicense: jest.fn(),
        login: jest.fn(),
        resetPing: jest.fn(),
        setLastUpgradeCheck: jest.fn(),
        setServerVersion: jest.fn(),
    };

    const baseProps = {
        actions,
        hasConfigAndLicense: true,
        serverUrl: '',
    };

    test('should match snapshot empty URL string', async () => {
        const wrapper = shallowWithIntl(
            <SelectServer {...baseProps}/>,
        );
        wrapper.instance().handleConnect();
        expect(wrapper.state().error).not.toBeNull();
        expect(wrapper.state().error.intl.id).toMatch('mobile.server_url.empty');
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
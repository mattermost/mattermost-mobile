// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import {type ComponentProps} from 'react';

import {doPing} from '@actions/remote/general';
import {DeepLink, Launch, Preferences} from '@constants';
import {renderWithIntl, waitFor} from '@test/intl-test-helper';
import {getServerUrlAfterRedirect} from '@utils/url';

import Server from './index';

jest.mock('@actions/remote/general', () => ({
    doPing: jest.fn(),
}));
jest.mock('@actions/remote/systems', () => ({
    fetchConfigAndLicense: jest.fn(),
}));
jest.mock('@components/app_version', () => jest.fn(() => null));
jest.mock('@hooks/did_mount', () => jest.fn());
jest.mock('@hooks/screen_transition_animation', () => ({
    useScreenTransitionAnimation: jest.fn(() => ({})),
}));
jest.mock('@init/push_notifications', () => ({
    __esModule: true,
    default: {
        registerIfNeeded: jest.fn(),
    },
}));
jest.mock('@mattermost/react-native-emm', () => ({
    __esModule: true,
    default: {
        addListener: jest.fn(() => jest.fn()),
    },
    useManagedConfig: jest.fn(() => ({})),
}));
jest.mock('@managers/network_manager', () => ({
    __esModule: true,
    default: {
        invalidateClient: jest.fn(),
    },
}));
jest.mock('@managers/security_manager', () => ({
    __esModule: true,
    default: {
        isDeviceJailbroken: jest.fn(),
    },
}));
jest.mock('@screens/background', () => jest.fn(() => null));
jest.mock('@utils/url', () => ({
    ...jest.requireActual('@utils/url'),
    getServerUrlAfterRedirect: jest.fn(),
}));
jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => ({
        addListener: jest.fn(() => jest.fn()),
    })),
}));
jest.mock('./form', () => jest.fn(() => null));
jest.mock('./header', () => jest.fn(() => null));

describe('Server', () => {
    const serverUrl = 'https://existingserver.com';
    const props: ComponentProps<typeof Server> = {
        displayName: 'Existing Server',
        extra: {
            data: {serverUrl: 'existingserver.com'},
            type: DeepLink.Server,
            url: 'mattermost://existingserver.com',
        },
        launchType: Launch.AddServerFromDeepLink,
        serverUrl,
        theme: Preferences.THEMES.denim,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should auto-connect using the canonical saved server URL from a deep link', async () => {
        jest.mocked(getServerUrlAfterRedirect).mockResolvedValueOnce({url: serverUrl});
        jest.mocked(doPing).mockResolvedValueOnce({error: new Error('stop after connection attempt')});

        renderWithIntl(<Server {...props}/>);

        await waitFor(() => {
            expect(getServerUrlAfterRedirect).toHaveBeenCalledWith(serverUrl, false, undefined);
            expect(doPing).toHaveBeenCalledWith(serverUrl, true, undefined, undefined);
        });
    });

    it('should reconnect when the deep-link request changes without changing the server URL', async () => {
        jest.mocked(getServerUrlAfterRedirect).mockResolvedValue({url: serverUrl});
        jest.mocked(doPing).mockResolvedValue({error: new Error('stop after connection attempt')});
        const {rerender} = renderWithIntl(
            <Server
                {...props}
                deepLinkRequestId={1}
            />,
        );
        await waitFor(() => expect(getServerUrlAfterRedirect).toHaveBeenCalledTimes(1));

        rerender(
            <Server
                {...props}
                deepLinkRequestId={2}
            />,
        );

        await waitFor(() => expect(getServerUrlAfterRedirect).toHaveBeenCalledTimes(2));
    });

    it('should start a new auto-connect when the deep-link request changes while a ping is pending', async () => {
        let resolveFirstRedirect!: (value: {url: string}) => void;
        const firstRedirect = new Promise<{url: string}>((resolve) => {
            resolveFirstRedirect = resolve;
        });
        jest.mocked(getServerUrlAfterRedirect).
            mockImplementationOnce(() => firstRedirect).
            mockResolvedValue({url: serverUrl});
        jest.mocked(doPing).mockResolvedValue({error: new Error('stop after connection attempt')});

        const {rerender} = renderWithIntl(
            <Server
                {...props}
                deepLinkRequestId={1}
            />,
        );
        await waitFor(() => expect(getServerUrlAfterRedirect).toHaveBeenCalledTimes(1));

        rerender(
            <Server
                {...props}
                deepLinkRequestId={2}
            />,
        );

        await waitFor(() => expect(getServerUrlAfterRedirect).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(doPing).toHaveBeenCalledTimes(1));

        await act(async () => {
            resolveFirstRedirect({url: serverUrl});
        });

        expect(doPing).toHaveBeenCalledTimes(1);
        expect(doPing).toHaveBeenCalledWith(serverUrl, true, undefined, undefined);
    });
});

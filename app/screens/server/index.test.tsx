// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import {type ComponentProps} from 'react';

import {doPing} from '@actions/remote/general';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {DeepLink, Launch, Preferences} from '@constants';
import {getServerCredentials} from '@init/credentials';
import {getServerByDisplayName} from '@queries/app/servers';
import {navigateToScreen} from '@screens/navigation';
import {renderWithIntl, waitFor} from '@test/intl-test-helper';
import {getServerUrlAfterRedirect} from '@utils/url';

import ServerForm from './form';

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
jest.mock('@init/credentials', () => ({
    getServerCredentials: jest.fn(),
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
jest.mock('@queries/app/servers', () => ({
    getServerByDisplayName: jest.fn(),
    getServerByIdentifier: jest.fn(),
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
jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
    navigateToScreen: jest.fn(),
}));
jest.mock('@screens/background', () => jest.fn(() => null));
jest.mock('@utils/push_proxy', () => ({
    canReceiveNotifications: jest.fn(),
}));
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
        jest.mocked(getServerByDisplayName).mockResolvedValue(undefined);
        jest.mocked(getServerCredentials).mockResolvedValue(null);
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

    it('should discard a stale deep-link auto-connect that pauses before pinging', async () => {
        let resolveFirstLookup!: (value: undefined) => void;
        const firstLookup = new Promise<undefined>((resolve) => {
            resolveFirstLookup = resolve;
        });
        jest.mocked(getServerByDisplayName).
            mockImplementationOnce(() => firstLookup).
            mockResolvedValue(undefined);
        jest.mocked(getServerUrlAfterRedirect).mockResolvedValue({url: serverUrl});
        jest.mocked(doPing).mockResolvedValue({error: new Error('stop after connection attempt')});

        const {rerender} = renderWithIntl(
            <Server
                {...props}
                deepLinkRequestId={1}
            />,
        );
        await waitFor(() => expect(getServerByDisplayName).toHaveBeenCalledTimes(1));

        rerender(
            <Server
                {...props}
                deepLinkRequestId={2}
            />,
        );

        await waitFor(() => expect(getServerByDisplayName).toHaveBeenCalledTimes(2));

        await act(async () => {
            resolveFirstLookup(undefined);
        });

        await waitFor(() => expect(getServerUrlAfterRedirect).toHaveBeenCalledTimes(1));
        expect(doPing).toHaveBeenCalledTimes(1);
        expect(getServerUrlAfterRedirect).toHaveBeenCalledWith(serverUrl, false, undefined);
        expect(doPing).toHaveBeenCalledWith(serverUrl, true, undefined, undefined);
    });

    it('should start a new button connect after a previous ping has finished', async () => {
        jest.mocked(getServerUrlAfterRedirect).mockResolvedValue({url: serverUrl});
        jest.mocked(doPing).mockResolvedValue({error: new Error('stop after connection attempt')});

        const {unmount} = renderWithIntl(<Server {...props}/>);
        await waitFor(() => expect(doPing).toHaveBeenCalledTimes(1));
        unmount();

        jest.mocked(ServerForm).mockClear();
        jest.mocked(getServerUrlAfterRedirect).mockClear();
        jest.mocked(doPing).mockClear();
        jest.mocked(getServerUrlAfterRedirect).mockResolvedValue({url: 'https://server-two.com'});
        jest.mocked(doPing).mockResolvedValue({error: new Error('stop after connection attempt')});

        renderWithIntl(
            <Server
                displayName='Server 2'
                launchType={Launch.AddServer}
                serverUrl='https://server-two.com'
                theme={Preferences.THEMES.denim}
            />,
        );

        await waitFor(() => {
            const lastCall = jest.mocked(ServerForm).mock.calls[jest.mocked(ServerForm).mock.calls.length - 1];
            expect(lastCall[0].buttonDisabled).toBe(false);
        });

        const lastCall = jest.mocked(ServerForm).mock.calls[jest.mocked(ServerForm).mock.calls.length - 1];
        const handleConnect = lastCall[0].handleConnect;
        await act(async () => {
            await handleConnect();
        });

        await waitFor(() => expect(getServerUrlAfterRedirect).toHaveBeenCalledTimes(1));
        expect(getServerUrlAfterRedirect).toHaveBeenCalledWith('https://server-two.com', false, undefined);
    });

    it('should look up the new display name when the deep-link request changes', async () => {
        jest.mocked(getServerUrlAfterRedirect).mockResolvedValue({url: serverUrl});
        jest.mocked(doPing).mockResolvedValue({canReceiveNotifications: 'ok'});
        jest.mocked(fetchConfigAndLicense).mockResolvedValue({
            config: {DiagnosticId: 'diag-1'} as ClientConfig,
            license: {} as ClientLicense,
        });

        const {rerender} = renderWithIntl(
            <Server
                {...props}
                displayName='Old Server'
                deepLinkRequestId={1}
            />,
        );
        await waitFor(() => expect(getServerByDisplayName).toHaveBeenCalledWith('Old Server'));
        await waitFor(() => {
            expect(navigateToScreen).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({serverDisplayName: 'Old Server'}),
            );
        });

        rerender(
            <Server
                {...props}
                displayName='New Server'
                deepLinkRequestId={2}
            />,
        );

        await waitFor(() => expect(getServerByDisplayName).toHaveBeenCalledWith('New Server'));
        await waitFor(() => {
            expect(navigateToScreen).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({serverDisplayName: 'New Server'}),
            );
        });
    });
});

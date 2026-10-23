// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import {setCurrentChannelId} from '@queries/servers/system';
import {navigateToScreen} from '@screens/navigation';

import IntegrationsManager from './integrations_manager';

jest.mock('@screens/navigation', () => ({

    // Must return true: tryShowDialog treats a falsy return as "navigation did not
    // happen" and releases the reserved dialog slot, so a bare jest.fn() (returning
    // undefined) would silently disable the MAX_OPEN_DIALOGS cap in every test here.
    navigateToScreen: jest.fn(() => true),
}));

jest.mock('@actions/remote/command', () => ({
    fetchCommands: jest.fn(),
}));

describe('ServerIntegrationsManager', () => {
    const serverUrl = 'https://example.com';
    const channelId = 'current-channel-id';

    // tryShowDialog reads the current channel from the database before navigating.
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    const makeDialog = (triggerId: string): InteractiveDialogConfig => ({
        app_id: 'app_id',
        trigger_id: triggerId,
        url: 'https://example.com/callback',
        dialog: {
            callback_id: `callback_${triggerId}`,
            title: `Dialog ${triggerId}`,
            introduction_text: '',
            elements: [],
            notify_on_cancel: false,
            state: '',
        },
    } as unknown as InteractiveDialogConfig);

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await setCurrentChannelId(operator, channelId);

        // Reset singleton state between tests by removing the cached manager instance.
        // @ts-expect-error accessing private field for test isolation
        IntegrationsManager.serverManagers = {};
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should navigate to the dialog when the dialog arrives before the trigger id', async () => {
        const dialog = makeDialog('trigger-1');
        const manager = IntegrationsManager.getManager(serverUrl);

        manager.setDialog(dialog);
        manager.setTriggerId('trigger-1');

        await flush();
        expect(navigateToScreen).toHaveBeenCalledTimes(1);
        expect(navigateToScreen).toHaveBeenCalledWith('dialog_router', {title: dialog.dialog.title, config: dialog, channelId});
    });

    it('should navigate to the dialog when the trigger id arrives before the dialog', async () => {
        const dialog = makeDialog('trigger-2');
        const manager = IntegrationsManager.getManager(serverUrl);

        manager.setTriggerId('trigger-2');
        manager.setDialog(dialog);

        await flush();
        expect(navigateToScreen).toHaveBeenCalledTimes(1);
        expect(navigateToScreen).toHaveBeenCalledWith('dialog_router', {title: dialog.dialog.title, config: dialog, channelId});
    });

    it('should resolve interleaved trigger ids and dialogs to their own config without swapping', async () => {
        const dialogA = makeDialog('trigger-a');
        const dialogB = makeDialog('trigger-b');
        const manager = IntegrationsManager.getManager(serverUrl);

        manager.setTriggerId('trigger-a');
        manager.setTriggerId('trigger-b');
        manager.setDialog(dialogB);
        manager.setDialog(dialogA);

        await flush();
        expect(navigateToScreen).toHaveBeenCalledTimes(2);
        expect(navigateToScreen).toHaveBeenNthCalledWith(1, 'dialog_router', {title: dialogB.dialog.title, config: dialogB, channelId});
        expect(navigateToScreen).toHaveBeenNthCalledWith(2, 'dialog_router', {title: dialogA.dialog.title, config: dialogA, channelId});
    });

    it('should not open a fourth dialog once MAX_OPEN_DIALOGS are already open', async () => {
        const manager = IntegrationsManager.getManager(serverUrl);

        for (let i = 1; i <= 3; i++) {
            const triggerId = `trigger-${i}`;
            manager.setTriggerId(triggerId);
            manager.setDialog(makeDialog(triggerId));
        }

        await flush();
        expect(navigateToScreen).toHaveBeenCalledTimes(3);

        manager.setTriggerId('trigger-4');
        manager.setDialog(makeDialog('trigger-4'));

        await flush();
        expect(navigateToScreen).toHaveBeenCalledTimes(3);
    });

    it('should not consume a dialog slot when navigation fails', async () => {
        // navigateToScreen swallows its failures (no router, unmapped screen, or a
        // throw), and the slot is otherwise released only by the route's unmount
        // cleanup — which never runs if the route never mounts. Without the rollback,
        // MAX_OPEN_DIALOGS failed navigations wedge the cap for the whole session and
        // every later dialog on this server is dropped.
        const manager = IntegrationsManager.getManager(serverUrl);
        jest.mocked(navigateToScreen).mockReturnValue(false);

        for (let i = 1; i <= 3; i++) {
            const triggerId = `fail-${i}`;
            manager.setTriggerId(triggerId);
            manager.setDialog(makeDialog(triggerId));
        }

        await flush();
        expect(navigateToScreen).toHaveBeenCalledTimes(3);

        // Navigation works again; the cap must not have been consumed by the failures.
        jest.mocked(navigateToScreen).mockReturnValue(true);
        manager.setTriggerId('after-failures');
        manager.setDialog(makeDialog('after-failures'));

        await flush();
        expect(navigateToScreen).toHaveBeenCalledTimes(4);
    });

    it('should allow a new dialog to open after closeDialog frees a cap slot', async () => {
        const manager = IntegrationsManager.getManager(serverUrl);

        for (let i = 1; i <= 3; i++) {
            const triggerId = `trigger-${i}`;
            manager.setTriggerId(triggerId);
            manager.setDialog(makeDialog(triggerId));
        }

        await flush();
        expect(navigateToScreen).toHaveBeenCalledTimes(3);

        manager.closeDialog('trigger-1');

        manager.setTriggerId('trigger-4');
        manager.setDialog(makeDialog('trigger-4'));

        await flush();
        expect(navigateToScreen).toHaveBeenCalledTimes(4);
    });

    it('should report the most recently opened dialog as the top dialog', async () => {
        const manager = IntegrationsManager.getManager(serverUrl);

        for (const triggerId of ['parent', 'child']) {
            manager.setTriggerId(triggerId);
            manager.setDialog(makeDialog(triggerId));
        }
        await flush();

        expect(manager.getTopDialogTriggerId()).toBe('child');

        manager.closeDialog('child');

        expect(manager.getTopDialogTriggerId()).toBe('parent');
    });

    it('should emit an event when a dialog closes', () => {
        const listener = jest.fn();
        const subscription = DeviceEventEmitter.addListener(Events.INTERACTIVE_DIALOG_CLOSED, listener);

        IntegrationsManager.getManager(serverUrl).closeDialog('trigger-1');
        subscription.remove();

        expect(listener).toHaveBeenCalledWith({serverUrl, triggerId: 'trigger-1'});
    });
});

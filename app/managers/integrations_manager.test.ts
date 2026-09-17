// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset singleton state between tests by removing the cached manager instance.
        // @ts-expect-error accessing private field for test isolation
        IntegrationsManager.serverManagers = {};
    });

    it('should navigate to the dialog when the dialog arrives before the trigger id', () => {
        const dialog = makeDialog('trigger-1');
        const manager = IntegrationsManager.getManager(serverUrl);

        manager.setDialog(dialog);
        manager.setTriggerId('trigger-1');

        expect(navigateToScreen).toHaveBeenCalledTimes(1);
        expect(navigateToScreen).toHaveBeenCalledWith('dialog_router', {title: dialog.dialog.title, config: dialog});
    });

    it('should navigate to the dialog when the trigger id arrives before the dialog', () => {
        const dialog = makeDialog('trigger-2');
        const manager = IntegrationsManager.getManager(serverUrl);

        manager.setTriggerId('trigger-2');
        manager.setDialog(dialog);

        expect(navigateToScreen).toHaveBeenCalledTimes(1);
        expect(navigateToScreen).toHaveBeenCalledWith('dialog_router', {title: dialog.dialog.title, config: dialog});
    });

    it('should resolve interleaved trigger ids and dialogs to their own config without swapping', () => {
        const dialogA = makeDialog('trigger-a');
        const dialogB = makeDialog('trigger-b');
        const manager = IntegrationsManager.getManager(serverUrl);

        manager.setTriggerId('trigger-a');
        manager.setTriggerId('trigger-b');
        manager.setDialog(dialogB);
        manager.setDialog(dialogA);

        expect(navigateToScreen).toHaveBeenCalledTimes(2);
        expect(navigateToScreen).toHaveBeenNthCalledWith(1, 'dialog_router', {title: dialogB.dialog.title, config: dialogB});
        expect(navigateToScreen).toHaveBeenNthCalledWith(2, 'dialog_router', {title: dialogA.dialog.title, config: dialogA});
    });

    it('should not open a fourth dialog once MAX_OPEN_DIALOGS are already open', () => {
        const manager = IntegrationsManager.getManager(serverUrl);

        for (let i = 1; i <= 3; i++) {
            const triggerId = `trigger-${i}`;
            manager.setTriggerId(triggerId);
            manager.setDialog(makeDialog(triggerId));
        }

        expect(navigateToScreen).toHaveBeenCalledTimes(3);

        manager.setTriggerId('trigger-4');
        manager.setDialog(makeDialog('trigger-4'));

        expect(navigateToScreen).toHaveBeenCalledTimes(3);
    });

    it('should not consume a dialog slot when navigation fails', () => {
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

        expect(navigateToScreen).toHaveBeenCalledTimes(3);

        // Navigation works again; the cap must not have been consumed by the failures.
        jest.mocked(navigateToScreen).mockReturnValue(true);
        manager.setTriggerId('after-failures');
        manager.setDialog(makeDialog('after-failures'));

        expect(navigateToScreen).toHaveBeenCalledTimes(4);
    });

    it('should allow a new dialog to open after closeDialog frees a cap slot', () => {
        const manager = IntegrationsManager.getManager(serverUrl);

        for (let i = 1; i <= 3; i++) {
            const triggerId = `trigger-${i}`;
            manager.setTriggerId(triggerId);
            manager.setDialog(makeDialog(triggerId));
        }

        expect(navigateToScreen).toHaveBeenCalledTimes(3);

        manager.closeDialog('trigger-1');

        manager.setTriggerId('trigger-4');
        manager.setDialog(makeDialog('trigger-4'));

        expect(navigateToScreen).toHaveBeenCalledTimes(4);
    });
});

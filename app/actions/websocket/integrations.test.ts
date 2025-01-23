// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import IntegrationsManager from '@managers/integrations_manager';
import {getActiveServerUrl} from '@queries/app/servers';

import {handleOpenDialogEvent} from './integrations';

jest.mock('@managers/integrations_manager');
jest.mock('@queries/app/servers');

describe('WebSocket Integrations Actions', () => {
    const serverUrl = 'baseHandler.test.com';

    beforeEach(() => {
        jest.clearAllMocks();
        const mockManager = {
            setDialog: jest.fn(),
        };
        jest.spyOn(IntegrationsManager, 'getManager').mockReturnValue(mockManager as any);
    });

    describe('handleOpenDialogEvent', () => {
        const mockDialog = {
            app_id: 'app1',
            trigger_id: 'trigger1',
            url: 'http://test.com',
            dialog: {
                callback_id: 'callback1',
                title: 'Test Dialog',
                introduction_text: 'Test Intro',
                elements: [],
                submit_label: 'Submit',
                notify_on_cancel: false,
                state: 'some-state',
            },
        } as InteractiveDialogConfig;

        it('should handle missing dialog data', async () => {
            const msg = {
                data: {},
            } as WebSocketMessage;

            await handleOpenDialogEvent(serverUrl, msg);

            expect(IntegrationsManager.getManager).not.toHaveBeenCalled();
        });

        it('should handle invalid JSON dialog data', async () => {
            const msg = {
                data: {
                    dialog: '{invalid json',
                },
            } as WebSocketMessage;

            await handleOpenDialogEvent(serverUrl, msg);

            expect(IntegrationsManager.getManager).not.toHaveBeenCalled();
        });

        it('should not set dialog when server url does not match active server', async () => {
            jest.mocked(getActiveServerUrl).mockResolvedValue('different-server');

            const msg = {
                data: {
                    dialog: JSON.stringify(mockDialog),
                },
            } as WebSocketMessage;

            await handleOpenDialogEvent(serverUrl, msg);

            expect(IntegrationsManager.getManager).not.toHaveBeenCalled();
        });

        it('should set dialog when server url matches active server', async () => {
            jest.mocked(getActiveServerUrl).mockResolvedValue(serverUrl);

            const msg = {
                data: {
                    dialog: JSON.stringify(mockDialog),
                },
            } as WebSocketMessage;

            await handleOpenDialogEvent(serverUrl, msg);

            expect(IntegrationsManager.getManager).toHaveBeenCalledWith(serverUrl);
            expect(IntegrationsManager.getManager(serverUrl).setDialog).toHaveBeenCalledWith(mockDialog);
        });
    });
});

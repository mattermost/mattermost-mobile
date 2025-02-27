// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchCommands} from '@actions/remote/command';
import {INTERACTIVE_DIALOG} from '@constants/screens';
import {showModal} from '@screens/navigation';

const TIME_TO_REFETCH_COMMANDS = 60000; // 1 minute
class ServerIntegrationsManager {
    private serverUrl: string;
    private commandsLastFetched: {[teamId: string]: number | undefined} = {};
    private commands: {[teamId: string]: Command[] | undefined} = {};

    private triggerId = '';
    private storedDialog?: InteractiveDialogConfig;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
    }

    public async fetchCommands(teamId: string) {
        const lastFetched = this.commandsLastFetched[teamId] || 0;
        const lastCommands = this.commands[teamId];
        if (lastCommands && lastFetched + TIME_TO_REFETCH_COMMANDS > Date.now()) {
            return lastCommands;
        }

        try {
            const res = await fetchCommands(this.serverUrl, teamId);
            if ('error' in res) {
                return [];
            }
            this.commands[teamId] = res.commands;
            this.commandsLastFetched[teamId] = Date.now();
            return res.commands;
        } catch {
            return [];
        }
    }

    public setTriggerId(id: string) {
        this.triggerId = id;
        if (this.storedDialog?.trigger_id === id) {
            this.showDialog();
        }
    }

    public setDialog(dialog: InteractiveDialogConfig) {
        this.storedDialog = dialog;
        if (this.triggerId === dialog.trigger_id) {
            this.showDialog();
        }
    }

    private showDialog() {
        const config = this.storedDialog;
        if (!config) {
            return;
        }
        showModal(INTERACTIVE_DIALOG, config.dialog.title, {config});
    }
}

class IntegrationsManagerSingleton {
    private serverManagers: {[serverUrl: string]: ServerIntegrationsManager | undefined} = {};
    public getManager(serverUrl: string): ServerIntegrationsManager {
        if (!this.serverManagers[serverUrl]) {
            this.serverManagers[serverUrl] = new ServerIntegrationsManager(serverUrl);
        }

        return this.serverManagers[serverUrl]!;
    }
}

const IntegrationsManager = new IntegrationsManagerSingleton();
export default IntegrationsManager;

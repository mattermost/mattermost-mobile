// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchCommands} from '@actions/remote/command';

const TIME_TO_REFETCH_COMMANDS = 60000; // 1 minute
class ServerIntegrationsManager {
    private serverUrl: string;
    private commandsLastFetched: {[teamId: string]: number | undefined} = {};
    private commands: {[teamId: string]: Command[] | undefined} = {};

    private triggerId = '';

    private bindings: AppBinding[] = [];
    private rhsBindings: AppBinding[] = [];

    private commandForms: {[key: string]: AppForm | undefined} = {};
    private rhsCommandForms: {[key: string]: AppForm | undefined} = {};

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
            if (res.error) {
                return [];
            }
            this.commands[teamId] = res.commands;
            this.commandsLastFetched[teamId] = Date.now();
            return res.commands;
        } catch {
            return [];
        }
    }

    public getCommandBindings() {
        // TODO filter bindings
        return this.bindings;
    }

    public getRHSCommandBindings() {
        // TODO filter bindings
        return this.rhsBindings;
    }

    public getAppRHSCommandForm(key: string) {
        return this.rhsCommandForms[key];
    }
    public getAppCommandForm(key: string) {
        return this.commandForms[key];
    }
    public setAppRHSCommandForm(key: string, form: AppForm) {
        this.rhsCommandForms[key] = form;
    }
    public setAppCommandForm(key: string, form: AppForm) {
        this.commandForms[key] = form;
    }

    public getTriggerId() {
        return this.triggerId;
    }
    public setTriggerId(id: string) {
        this.triggerId = id;
    }
}

class IntegrationsManager {
    private serverManagers: {[serverUrl: string]: ServerIntegrationsManager | undefined} = {};
    public getManager(serverUrl: string): ServerIntegrationsManager {
        if (!this.serverManagers[serverUrl]) {
            this.serverManagers[serverUrl] = new ServerIntegrationsManager(serverUrl);
        }

        return this.serverManagers[serverUrl]!;
    }
}

export default new IntegrationsManager();

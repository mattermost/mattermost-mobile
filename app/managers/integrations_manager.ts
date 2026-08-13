// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchCommands} from '@actions/remote/command';
import {Screens} from '@constants';
import {MAX_OPEN_DIALOGS} from '@constants/integrations';
import {navigateToScreen} from '@screens/navigation';
import {logDebug} from '@utils/log';

const TIME_TO_REFETCH_COMMANDS = 60000; // 1 minute

// Upper bound on unmatched pending trigger ids / dialogs.
//
// setTriggerId is called for every slash command and post action that returns a
// trigger_id, and most of those never open a dialog, so without a bound these
// collections grow for the lifetime of the process. Bounding them also limits how long
// a stale trigger id stays matchable: a much later, duplicated `open_dialog` event can
// otherwise pop a dialog on the user long after the command that produced it.
//
// Dialogs form a strict stack: only the top one is interactive, so a child can only be
// opened from the top and at most one open is ever in flight from user interaction. The
// bound is therefore generous on purpose — it only needs to cover that one in-flight
// pair plus any dialogs pushed from other sources (a slash command, a plugin) while it
// resolves, and nothing legitimate should ever be evicted.
const MAX_PENDING_TRIGGERS = MAX_OPEN_DIALOGS * 2;

class ServerIntegrationsManager {
    private serverUrl: string;
    private commandsLastFetched: {[teamId: string]: number | undefined} = {};
    private commands: {[teamId: string]: Command[] | undefined} = {};

    private pendingTriggerIds: Set<string> = new Set();
    private pendingDialogs: Map<string, InteractiveDialogConfig> = new Map();
    private openDialogTriggerIds: Set<string> = new Set();

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

    // Set and Map both iterate in insertion order, so the first key is the oldest.
    private evictOldest<K>(collection: Set<K> | Map<K, unknown>) {
        while (collection.size > MAX_PENDING_TRIGGERS) {
            const oldest = collection.keys().next();
            if (oldest.done) {
                return;
            }
            collection.delete(oldest.value);
        }
    }

    public setTriggerId(id: string) {
        this.pendingTriggerIds.add(id);
        this.evictOldest(this.pendingTriggerIds);

        const pendingDialog = this.pendingDialogs.get(id);
        if (pendingDialog) {
            this.pendingDialogs.delete(id);
            this.pendingTriggerIds.delete(id);
            this.tryShowDialog(pendingDialog);
        }
    }

    public setDialog(dialog: InteractiveDialogConfig) {
        if (!dialog.trigger_id) {
            return;
        }

        if (this.pendingTriggerIds.has(dialog.trigger_id)) {
            this.pendingTriggerIds.delete(dialog.trigger_id);
            this.tryShowDialog(dialog);
            return;
        }

        this.pendingDialogs.set(dialog.trigger_id, dialog);
        this.evictOldest(this.pendingDialogs);
    }

    public closeDialog(triggerId: string) {
        this.openDialogTriggerIds.delete(triggerId);
    }

    private tryShowDialog(config: InteractiveDialogConfig) {
        if (this.openDialogTriggerIds.size >= MAX_OPEN_DIALOGS) {
            logDebug('ServerIntegrationsManager.tryShowDialog', 'Max open dialogs reached, dropping dialog');
            return;
        }

        // The slot is only released by DialogRouterRoute's unmount cleanup, so it must
        // not be reserved when the route will never mount — otherwise a failed
        // navigation permanently consumes one and, after MAX_OPEN_DIALOGS failures,
        // every later dialog on this server is dropped for the rest of the session.
        this.openDialogTriggerIds.add(config.trigger_id);
        if (!navigateToScreen(Screens.DIALOG_ROUTER, {title: config.dialog.title, config})) {
            this.openDialogTriggerIds.delete(config.trigger_id);
            logDebug('ServerIntegrationsManager.tryShowDialog', 'navigation failed, released dialog slot');
        }
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

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject, combineLatest, of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import DatabaseManager from '@database/manager';
import {getChannelById} from '@queries/servers/channel';
import {getConfig, getCurrentChannelId, getCurrentTeamId, getCurrentUserId, observeConfigBooleanValue} from '@queries/servers/system';
import {validateBindings} from '@utils/apps';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import NetworkManager from './network_manager';

const emptyBindings: AppBinding[] = [];

const normalizeBindings = (bindings: AppBinding[]) => bindings.reduce<AppBinding[]>((acc, v) => (v.bindings ? acc.concat(v.bindings) : acc), []);

export class AppsManagerSingleton {
    private enabled: {[serverUrl: string]: BehaviorSubject<boolean>} = {};

    private bindings: {[serverUrl: string]: BehaviorSubject<AppBinding[]>} = {};
    private threadBindings: {[serverUrl: string]: BehaviorSubject<{channelId: string; bindings: AppBinding[]}>} = {};

    private commandForms: {[serverUrl: string]: {[location: string]: AppForm}} = {};
    private threadCommandForms: {[serverUrl: string]: {[location: string]: AppForm}} = {};

    private getEnabledSubject = (serverUrl: string) => {
        if (!this.enabled[serverUrl]) {
            this.enabled[serverUrl] = new BehaviorSubject(true);
        }

        return this.enabled[serverUrl];
    };

    private getBindingsSubject = (serverUrl: string) => {
        if (!this.bindings[serverUrl]) {
            this.bindings[serverUrl] = new BehaviorSubject([]);
        }

        return this.bindings[serverUrl];
    };

    private getThreadsBindingsSubject = (serverUrl: string) => {
        if (!this.threadBindings[serverUrl]) {
            this.threadBindings[serverUrl] = new BehaviorSubject({channelId: '', bindings: emptyBindings});
        }

        return this.threadBindings[serverUrl];
    };

    private handleError = (serverUrl: string) => {
        const enabled = this.getEnabledSubject(serverUrl);
        if (enabled.value) {
            enabled.next(false);
        }
        this.getBindingsSubject(serverUrl).next(emptyBindings);
        this.getThreadsBindingsSubject(serverUrl).next({channelId: '', bindings: emptyBindings});

        this.commandForms[serverUrl] = {};
        this.threadCommandForms[serverUrl] = {};
    };

    removeServer = (serverUrl: string) => {
        delete (this.enabled[serverUrl]);

        delete (this.bindings[serverUrl]);
        delete (this.threadBindings[serverUrl]);

        delete (this.commandForms[serverUrl]);
        delete (this.threadCommandForms[serverUrl]);
    };

    clearServer = (serverUrl: string) => {
        this.clearBindings(serverUrl);
        this.clearBindings(serverUrl, true);
        this.commandForms[serverUrl] = {};
        this.threadCommandForms[serverUrl] = {};
    };

    isAppsEnabled = async (serverUrl: string) => {
        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const config = await getConfig(database);
            return this.getEnabledSubject(serverUrl).value && config?.FeatureFlagAppsEnabled === 'true';
        } catch {
            return false;
        }
    };

    observeIsAppsEnabled = (serverUrl: string) => {
        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const enabled = this.getEnabledSubject(serverUrl).asObservable();
            const config = observeConfigBooleanValue(database, 'FeatureFlagAppsEnabled');
            return combineLatest([enabled, config]).pipe(
                switchMap(([e, cfg]) => of$(e && cfg)),
                distinctUntilChanged(),
            );
        } catch {
            return of$(false);
        }
    };

    fetchBindings = async (serverUrl: string, channelId: string, forThread = false, groupLabel?: RequestGroupLabel) => {
        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const userId = await getCurrentUserId(database);
            const channel = await getChannelById(database, channelId);
            let teamId = channel?.teamId;
            if (!teamId) {
                teamId = await getCurrentTeamId(database);
            }

            const client = NetworkManager.getClient(serverUrl);
            const fetchedBindings = await client.getAppsBindings(userId, channelId, teamId, groupLabel);
            const validatedBindings = validateBindings(fetchedBindings);
            const bindingsToStore = validatedBindings.length ? validatedBindings : emptyBindings;

            const enabled = this.getEnabledSubject(serverUrl);
            if (!enabled.value) {
                enabled.next(true);
            }
            if (forThread) {
                this.getThreadsBindingsSubject(serverUrl).next({channelId, bindings: bindingsToStore});
                this.threadCommandForms[serverUrl] = {};
            } else {
                this.getBindingsSubject(serverUrl).next(bindingsToStore);
                this.commandForms[serverUrl] = {};
            }
        } catch (error) {
            logDebug('error on fetchBindings', getFullErrorMessage(error));
            this.handleError(serverUrl);
        }
    };

    refreshAppBindings = async (serverUrl: string, groupLabel?: RequestGroupLabel) => {
        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const appsEnabled = await this.isAppsEnabled(serverUrl);
            if (!appsEnabled) {
                this.getEnabledSubject(serverUrl).next(false);
                this.clearServer(serverUrl);
                return;
            }

            const channelId = await getCurrentChannelId(database);

            // We await here, since errors on this call may clear the thread bindings
            await this.fetchBindings(serverUrl, channelId, false, groupLabel);

            const threadChannelId = this.getThreadsBindingsSubject(serverUrl).value.channelId;
            if (threadChannelId) {
                await this.fetchBindings(serverUrl, threadChannelId, true, groupLabel);
            }
        } catch (error) {
            logDebug('Error refreshing apps', error);
            this.handleError(serverUrl);
        }
    };

    copyMainBindingsToThread = async (serverUrl: string, channelId: string) => {
        this.getThreadsBindingsSubject(serverUrl).next({channelId, bindings: this.getBindingsSubject(serverUrl).value});
    };

    clearBindings = async (serverUrl: string, forThread = false) => {
        if (forThread) {
            this.getThreadsBindingsSubject(serverUrl).next({channelId: '', bindings: emptyBindings});
        } else {
            this.getBindingsSubject(serverUrl).next(emptyBindings);
        }
    };

    observeBindings = (serverUrl: string, location?: string, forThread = false) => {
        const isEnabled = this.observeIsAppsEnabled(serverUrl);
        const bindings = forThread ? this.getThreadsBindingsSubject(serverUrl).asObservable().pipe(switchMap(({bindings: bb}) => of$(bb))) : this.getBindingsSubject(serverUrl).asObservable();

        return combineLatest([isEnabled, bindings]).pipe(
            switchMap(([e, bb]) => of$(e ? bb : emptyBindings)),
            switchMap((bb) => {
                let result = location ? bb.filter((b) => b.location === location) : bb;
                result = normalizeBindings(result);
                return of$(result.length ? result : emptyBindings);
            }),
        );
    };

    getBindings = (serverUrl: string, location?: string, forThread = false) => {
        let bindings = forThread ? this.getThreadsBindingsSubject(serverUrl).value.bindings : this.getBindingsSubject(serverUrl).value;

        if (location) {
            bindings = bindings.filter((b) => b.location === location);
        }

        return normalizeBindings(bindings);
    };

    getCommandForm = (serverUrl: string, key: string, forThread = false) => {
        return forThread ? this.threadCommandForms[serverUrl]?.[key] : this.commandForms[serverUrl]?.[key];
    };

    setCommandForm = (serverUrl: string, key: string, form: AppForm, forThread = false) => {
        const toStore = forThread ? this.threadCommandForms : this.commandForms;
        if (!toStore[serverUrl]) {
            toStore[serverUrl] = {};
        }
        toStore[serverUrl][key] = form;
    };
}

const AppsManager = new AppsManagerSingleton();
export default AppsManager;

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

export type AgentsConfigState = {
    pluginEnabled: boolean;

    // Global server config: when true, links in agent posts are rendered as
    // tappable even though the plugin tags every bot post unsafe_links=true.
    allowUnsafeLinks: boolean;
};

const DefaultAgentsConfig: AgentsConfigState = {
    pluginEnabled: false,
    allowUnsafeLinks: false,
};

const agentsConfigSubjects: Dictionary<BehaviorSubject<AgentsConfigState>> = {};

const getAgentsConfigSubject = (serverUrl: string) => {
    if (!agentsConfigSubjects[serverUrl]) {
        agentsConfigSubjects[serverUrl] = new BehaviorSubject(DefaultAgentsConfig);
    }

    return agentsConfigSubjects[serverUrl];
};

export const getAgentsConfig = (serverUrl: string) => {
    return getAgentsConfigSubject(serverUrl).value;
};

export const setAgentsConfig = (serverUrl: string, config: Partial<AgentsConfigState>) => {
    const subject = getAgentsConfigSubject(serverUrl);
    subject.next({...subject.value, ...config});
};

/** Drop a server's agents config (per-server logout). */
export const removeAgentsConfig = (serverUrl: string) => {
    const subject = agentsConfigSubjects[serverUrl];
    if (!subject) {
        return;
    }
    subject.next(DefaultAgentsConfig);
    subject.complete();
    delete agentsConfigSubjects[serverUrl];
};

export const observeAgentsConfig = (serverUrl: string) => {
    return getAgentsConfigSubject(serverUrl).asObservable();
};

export const useAgentsConfig = (serverUrl: string) => {
    const agentsConfigSubject = getAgentsConfigSubject(serverUrl);

    // Seed from the current value so consumers don't render the default for a
    // frame (e.g. agent links flashing as unsafe).
    const [state, setState] = useState(() => agentsConfigSubject.value);

    useEffect(() => {
        const subscription = agentsConfigSubject.subscribe((agentsConfig) => {
            setState(agentsConfig);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [agentsConfigSubject]);

    return state;
};

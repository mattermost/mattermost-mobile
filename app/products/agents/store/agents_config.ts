// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

export type AgentsConfigState = {
    pluginEnabled: boolean;
};

const DefaultAgentsConfig: AgentsConfigState = {
    pluginEnabled: false,
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

export const observeAgentsConfig = (serverUrl: string) => {
    return getAgentsConfigSubject(serverUrl).asObservable();
};

export const useAgentsConfig = (serverUrl: string) => {
    const [state, setState] = useState(DefaultAgentsConfig);

    const agentsConfigSubject = getAgentsConfigSubject(serverUrl);

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

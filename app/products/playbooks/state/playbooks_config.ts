// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import {type PlaybooksConfigState, DefaultPlaybooksConfig} from '../types/playbooks';

const playbooksConfigSubjects: Dictionary<BehaviorSubject<PlaybooksConfigState>> = {};

const getPlaybooksConfigSubject = (serverUrl: string) => {
    if (!playbooksConfigSubjects[serverUrl]) {
        playbooksConfigSubjects[serverUrl] = new BehaviorSubject(DefaultPlaybooksConfig);
    }

    return playbooksConfigSubjects[serverUrl];
};

export const getPlaybooksConfig = (serverUrl: string) => {
    return getPlaybooksConfigSubject(serverUrl).value;
};

export const setPlaybooksConfig = (serverUrl: string, playbooksConfig: PlaybooksConfigState) => {
    getPlaybooksConfigSubject(serverUrl).next(playbooksConfig);
};

export const observePlaybooksConfig = (serverUrl: string) => {
    return getPlaybooksConfigSubject(serverUrl).asObservable();
};

export const usePlaybooksConfig = (serverUrl: string) => {
    const [state, setState] = useState(DefaultPlaybooksConfig);

    const playbooksConfigSubject = getPlaybooksConfigSubject(serverUrl);

    useEffect(() => {
        const subscription = playbooksConfigSubject.subscribe((playbooksConfig) => {
            setState(playbooksConfig);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    return state;
};

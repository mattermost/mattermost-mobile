// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {safeParseJSON} from '@utils/helpers';
import {logDebug} from '@utils/log';

import type SystemModel from '@typings/database/models/servers/system';

export type ClassificationBannerState = {
    visible: boolean;
    levelName: string;
    color: string;
};

const DefaultClassificationBannerState: ClassificationBannerState = {
    visible: false,
    levelName: '',
    color: '',
};

const classificationBannerSubjects: Record<string, BehaviorSubject<ClassificationBannerState>> = {};

const getClassificationBannerSubject = (serverUrl: string) => {
    if (!classificationBannerSubjects[serverUrl]) {
        classificationBannerSubjects[serverUrl] = new BehaviorSubject(DefaultClassificationBannerState);
        loadFromDatabase(serverUrl);
    }

    return classificationBannerSubjects[serverUrl];
};

async function loadFromDatabase(serverUrl: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const record = await database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).find(SYSTEM_IDENTIFIERS.CLASSIFICATION_BANNER);
        const parsed = safeParseJSON(record?.value as string) as ClassificationBannerState | undefined;
        if (parsed?.levelName) {
            const subject = classificationBannerSubjects[serverUrl];
            if (subject) {
                subject.next(parsed);
            }
        }
    } catch {
        // Record doesn't exist yet — keep the default
    }
}

export const getClassificationBannerState = (serverUrl: string) => {
    return getClassificationBannerSubject(serverUrl).value;
};

export const setClassificationBannerState = (serverUrl: string, state: ClassificationBannerState) => {
    const subject = getClassificationBannerSubject(serverUrl);
    const current = subject.value;
    if (current.visible === state.visible && current.levelName === state.levelName && current.color === state.color) {
        return;
    }
    subject.next(state);
    persistToDatabase(serverUrl, state);
};

async function persistToDatabase(serverUrl: string, state: ClassificationBannerState) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CLASSIFICATION_BANNER, value: JSON.stringify(state)}],
            prepareRecordsOnly: false,
        });
    } catch (e) {
        logDebug('persistClassificationBanner', 'Failed to persist classification banner state', e);
    }
}

export const observeClassificationBanner = (serverUrl: string) => {
    return getClassificationBannerSubject(serverUrl).asObservable();
};

export const useClassificationBannerState = (serverUrl: string) => {
    const [state, setState] = useState(() => getClassificationBannerSubject(serverUrl).value);

    useEffect(() => {
        const subscription = getClassificationBannerSubject(serverUrl).subscribe((bannerState) => {
            setState(bannerState);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [serverUrl]);

    return state;
};

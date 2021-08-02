// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {DeviceEventEmitter, NativeModules, useWindowDimensions} from 'react-native';

import {Device} from '@constants';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import type GlobalModel from '@typings/database/models/app/global';

const {MattermostManaged} = NativeModules;
const isRunningInSplitView = MattermostManaged.isRunningInSplitView;

export function usePermanentSidebar() {
    const [permanentSidebar, setPermanentSidebar] = useState(Device.IS_TABLET);

    useEffect(() => {
        const handlePermanentSidebar = async () => {
            if (Device.IS_TABLET) {
                const database = DatabaseManager.appDatabase?.database;
                if (database) {
                    try {
                        const enabled = await database.get(MM_TABLES.APP.GLOBAL).find(Device.PERMANENT_SIDEBAR_SETTINGS) as GlobalModel;
                        setPermanentSidebar(enabled.value === 'true');
                    } catch {
                        setPermanentSidebar(false);
                    }
                }
            }
        };

        handlePermanentSidebar();

        const listener = DeviceEventEmitter.addListener(Device.PERMANENT_SIDEBAR_SETTINGS, handlePermanentSidebar);

        return () => {
            listener.remove();
        };
    }, []);

    return permanentSidebar;
}

export function useSplitView() {
    const [isSplitView, setIsSplitView] = useState(false);
    const dimensions = useWindowDimensions();

    useEffect(() => {
        if (Device.IS_TABLET) {
            isRunningInSplitView().then((result: {isSplitView: boolean}) => {
                setIsSplitView(result.isSplitView);
            });
        }
    }, [dimensions]);

    return isSplitView;
}

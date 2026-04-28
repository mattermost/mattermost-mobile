// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useRef, useState} from 'react';

import {
    DISPLAY_BANNER_TOP,
    FIELD_NAME,
    GROUP_NAME,
    LINKED_FIELD_NAME,
    LINKED_OBJECT_TYPE,
    OBJECT_TYPE,
    TARGET_TYPE,
} from '@constants/classification';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentUserId} from '@queries/servers/system';
import {logWarning} from '@utils/log';

type ClassificationBannerData = {
    visible: boolean;
    levelName: string;
    color: string;
};

const defaultData: ClassificationBannerData = {
    visible: false,
    levelName: '',
    color: '',
};

function findOptionById(options: PropertyFieldOption[], id: string): PropertyFieldOption | undefined {
    return options.find((o) => o.id === id);
}

export function useClassificationBanner(featureEnabled: boolean): ClassificationBannerData {
    const serverUrl = useServerUrl();
    const [data, setData] = useState<ClassificationBannerData>(defaultData);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const fetchData = useCallback(async () => {
        if (!featureEnabled) {
            if (isMounted.current) {
                setData(defaultData);
            }
            return;
        }

        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const currentUserId = await getCurrentUserId(database);
            if (!currentUserId) {
                return;
            }

            const client = NetworkManager.getClient(serverUrl);

            const [templateFields, linkedFields] = await Promise.all([
                client.getPropertyFields(GROUP_NAME, OBJECT_TYPE, TARGET_TYPE),
                client.getPropertyFields(GROUP_NAME, LINKED_OBJECT_TYPE, TARGET_TYPE),
            ]);

            const templateField = templateFields.find(
                (f: PropertyField) => f.object_type === OBJECT_TYPE && f.name === FIELD_NAME && f.delete_at === 0,
            );

            const linkedField = linkedFields.find(
                (f: PropertyField) => f.object_type === LINKED_OBJECT_TYPE && f.name === LINKED_FIELD_NAME && f.linked_field_id && f.delete_at === 0,
            );

            if (!templateField || !linkedField) {
                if (isMounted.current) {
                    setData(defaultData);
                }
                return;
            }

            const actions = (linkedField.attrs?.actions as string[] | undefined) ?? [];
            const shouldRenderTop = actions.includes(DISPLAY_BANNER_TOP);

            if (!shouldRenderTop) {
                if (isMounted.current) {
                    setData(defaultData);
                }
                return;
            }

            const values = await client.getPropertyValues<string>(GROUP_NAME, LINKED_OBJECT_TYPE, currentUserId);
            const systemValue = values.find((v: PropertyValue<string>) => v.field_id === linkedField.id);
            const optionId = systemValue?.value ?? '';

            if (!optionId) {
                if (isMounted.current) {
                    setData(defaultData);
                }
                return;
            }

            const options = (templateField.attrs?.options as PropertyFieldOption[]) ?? [];
            const levelOption = findOptionById(options, optionId);

            if (isMounted.current) {
                setData({
                    visible: Boolean(levelOption?.name),
                    levelName: levelOption?.name ?? '',
                    color: levelOption?.color ?? '',
                });
            }
        } catch (e) {
            logWarning('Failed to fetch classification banner data', e);
            if (isMounted.current) {
                setData(defaultData);
            }
        }
    }, [featureEnabled, serverUrl]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return data;
}

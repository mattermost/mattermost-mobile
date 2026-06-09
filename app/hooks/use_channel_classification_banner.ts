// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useMemo, useState} from 'react';
import {combineLatest} from 'rxjs';

import {fetchChannelClassificationValue} from '@actions/remote/classification';
import {
    CLASSIFICATIONS_CHANNEL_FIELD_NAME,
    CLASSIFICATIONS_GROUP_NAME,
    CLASSIFICATIONS_SYSTEM_FIELD_NAME,
} from '@constants/classification';
import DatabaseManager from '@database/manager';
import {observePropertyFields, observePropertyGroupNames, observePropertyValues} from '@queries/servers/properties';
import {logError} from '@utils/log';

export type ChannelClassificationBannerState = {
    hasClassification: boolean;
    classificationBanner: ChannelBannerInfo | undefined;
};

const noClassification: ChannelClassificationBannerState = {
    hasClassification: false,
    classificationBanner: undefined,
};

type DbSnapshot = {
    fieldsByGroup: Record<string, PropertyField[]>;
    valuesByTarget: Record<string, Array<PropertyValue<string>>>;
    groupNames: Record<string, string>;
};

const emptySnapshot: DbSnapshot = {fieldsByGroup: {}, valuesByTarget: {}, groupNames: {}};

const isClassificationField = (f: PropertyField) =>
    f.name === CLASSIFICATIONS_SYSTEM_FIELD_NAME || f.name === CLASSIFICATIONS_CHANNEL_FIELD_NAME;

/**
 * Resolves the effective classification banner for a channel.
 *
 * If a classification property value exists for this channel, returns
 * a ChannelBannerInfo derived from the classification level (color and
 * name resolved from available field options, text from the channel's
 * banner_info or falling back to the level name).
 *
 * Consumers merge this with the native banner_info to decide what to render.
 */
export function useChannelClassificationBanner(
    serverUrl: string,
    channelId: string,
    nativeBannerInfo?: ChannelBannerInfo,
): ChannelClassificationBannerState {
    const [snapshot, setSnapshot] = useState<DbSnapshot>(emptySnapshot);

    useEffect(() => {
        let database;
        try {
            ({database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl));
        } catch {
            return undefined;
        }

        const sub = combineLatest([
            observePropertyFields(database),
            observePropertyValues(database),
            observePropertyGroupNames(database),
        ]).subscribe({
            next: ([fieldsByGroup, valuesByTarget, groupNames]) =>
                setSnapshot({fieldsByGroup, valuesByTarget, groupNames}),
            error: (e) => logError('useChannelClassificationBanner', e),
        });

        return () => sub.unsubscribe();
    }, [serverUrl]);

    const fields = useMemo(() => {
        const mappedId = snapshot.groupNames[CLASSIFICATIONS_GROUP_NAME] ?? '';
        if (mappedId) {
            return snapshot.fieldsByGroup[mappedId] ?? [];
        }
        for (const gfields of Object.values(snapshot.fieldsByGroup)) {
            if (gfields.some(isClassificationField)) {
                return gfields;
            }
        }
        return [] as PropertyField[];
    }, [snapshot.groupNames, snapshot.fieldsByGroup]);

    const channelValues = channelId ? (snapshot.valuesByTarget[channelId] ?? []) : [];
    const channelValue = channelValues.length > 0 ? channelValues[0] : undefined;

    const hasFields = fields.length > 0;

    useEffect(() => {
        if (!channelId || !hasFields) {
            return;
        }
        if (!channelValue) {
            fetchChannelClassificationValue(serverUrl, channelId);
        }
    }, [serverUrl, channelId, hasFields, channelValue]);

    return useMemo((): ChannelClassificationBannerState => {
        if (!channelValue?.value || channelValue.delete_at !== 0) {
            return noClassification;
        }

        const classificationId = channelValue.value;
        if (typeof classificationId !== 'string') {
            return noClassification;
        }

        const fieldWithOptions = fields.find((f) => (f.attrs?.options as PropertyFieldOption[] | undefined)?.length);
        const options = (fieldWithOptions?.attrs?.options as PropertyFieldOption[]) ?? [];
        const level = options.find((o) => o.id === classificationId);
        if (!level) {
            return noClassification;
        }

        const bannerText = nativeBannerInfo?.text ?? `**${level.name}**`;

        return {
            hasClassification: true,
            classificationBanner: {
                enabled: true,
                text: bannerText,
                background_color: level.color,
            },
        };
    }, [channelValue, fields, nativeBannerInfo]);
}

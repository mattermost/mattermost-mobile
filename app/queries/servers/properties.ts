// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {combineLatest} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {
    CLASSIFICATIONS_CHANNEL_FIELD_NAME,
    CLASSIFICATIONS_SYSTEM_FIELD_NAME,
    CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID,
} from '@constants/classification';
import {MM_TABLES} from '@constants/database';
import {deriveChannelClassificationBanner, deriveClassificationBannerState} from '@utils/classification';

import type {PropertyFieldModel, PropertyValueModel} from '@database/models/server';

const {SERVER: {PROPERTY_FIELD, PROPERTY_VALUE}} = MM_TABLES;

const CLASSIFICATION_FIELD_NAMES = [CLASSIFICATIONS_SYSTEM_FIELD_NAME, CLASSIFICATIONS_CHANNEL_FIELD_NAME];

// --- Reactive observables (used by hooks for real-time UI updates) ---

export const observeClassificationFields = (database: Database) => {
    return database.get<PropertyFieldModel>(PROPERTY_FIELD).query(
        Q.where('name', Q.oneOf(CLASSIFICATION_FIELD_NAMES)),
        Q.where('delete_at', 0),
    ).observeWithColumns(['update_at', 'delete_at', 'attrs']);
};

export const observePropertyValuesByTargetId = (database: Database, targetId: string) => {
    return database.get<PropertyValueModel>(PROPERTY_VALUE).query(
        Q.where('target_id', targetId),
        Q.where('delete_at', 0),
    ).observeWithColumns(['value', 'update_at', 'delete_at']);
};

// --- Classification banner observables ---

export const observeClassificationBannerState = (database: Database) => {
    return combineLatest([
        observeClassificationFields(database),
        observePropertyValuesByTargetId(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID),
    ]).pipe(
        map(([fields, values]) => deriveClassificationBannerState(fields, values)),
        distinctUntilChanged((a, b) => a.visible === b.visible && a.levelName === b.levelName && a.color === b.color),
    );
};

export const observeChannelClassificationBanner = (database: Database, channelId: string, nativeBannerText?: string) => {
    return combineLatest([
        observeClassificationFields(database),
        observePropertyValuesByTargetId(database, channelId),
    ]).pipe(
        map(([fields, values]) => deriveChannelClassificationBanner(fields, values, nativeBannerText)),
        distinctUntilChanged((a, b) => a.hasClassification === b.hasClassification &&
            a.classificationBanner?.text === b.classificationBanner?.text &&
            a.classificationBanner?.background_color === b.classificationBanner?.background_color),
    );
};

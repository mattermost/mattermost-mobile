// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {combineLatest, of as of$, type Observable} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {License} from '@constants';
import {CHANNEL_ATTRIBUTE_OBJECT_TYPE} from '@constants/channel_attributes';
import {
    CLASSIFICATIONS_FIELD_NAME,
    CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID,
} from '@constants/classification';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {
    deriveChannelAttributeBanner,
    resolveChannelAttributes,
    type ChannelAttributeBannerState,
    type ResolvedChannelAttribute,
} from '@utils/channel_attributes';
import {deriveClassificationBannerState} from '@utils/classification';

import {observeConfigBooleanValue, observeIsMinimumLicenseTier} from './system';

import type {PropertyFieldModel, PropertyValueModel, SystemModel} from '@database/models/server';

const {SERVER: {PROPERTY_FIELD, PROPERTY_VALUE, SYSTEM}} = MM_TABLES;

export const getPropertyFieldsByNames = (database: Database, names: string[]) => {
    return database.get<PropertyFieldModel>(PROPERTY_FIELD).query(Q.where('name', Q.oneOf(names))).fetch();
};

export const getPropertyFieldsByGroupId = (database: Database, groupId: string) => {
    return database.get<PropertyFieldModel>(PROPERTY_FIELD).query(Q.where('group_id', groupId)).fetch();
};

export const getPropertyFieldsByIds = (database: Database, ids: string[]) => {
    return database.get<PropertyFieldModel>(PROPERTY_FIELD).query(Q.where('id', Q.oneOf(ids))).fetch();
};

export const getPropertyValuesByFieldId = (database: Database, fieldId: string) => {
    return database.get<PropertyValueModel>(PROPERTY_VALUE).query(Q.where('field_id', fieldId)).fetch();
};

/**
 * The values stored against one target that belong to the access_control group.
 *
 * Scoped by group on purpose: several features keep per-channel values in this
 * table, so anything that deletes "everything for this target" has to be narrowed
 * or it takes another feature's data with it. Returns nothing when the group id is
 * not yet known, which is the safe direction for a destructive caller.
 */
export const getAccessControlValuesForTarget = async (database: Database, targetId: string) => {
    const groupId = await getAccessControlGroupId(database);
    if (!groupId) {
        return [];
    }

    return database.get<PropertyValueModel>(PROPERTY_VALUE).query(
        Q.where('target_id', targetId),
        Q.where('group_id', groupId),
    ).fetch();
};

export const observeClassificationFields = (database: Database) => {
    return database.get<PropertyFieldModel>(PROPERTY_FIELD).query(
        Q.where('name', CLASSIFICATIONS_FIELD_NAME),
        Q.where('delete_at', 0),
    ).observeWithColumns(['update_at', 'delete_at', 'attrs']);
};

export const observePropertyValuesByTargetId = (database: Database, targetId: string) => {
    return database.get<PropertyValueModel>(PROPERTY_VALUE).query(
        Q.where('target_id', targetId),
        Q.where('delete_at', 0),
    ).observeWithColumns(['value', 'update_at', 'delete_at']);
};

export const observeClassificationBannerState = (database: Database) => {
    return combineLatest([
        observeClassificationFields(database),
        observePropertyValuesByTargetId(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID),
    ]).pipe(
        map(([fields, values]) => deriveClassificationBannerState(fields, values)),
        distinctUntilChanged((a, b) => a.visible === b.visible && a.levelName === b.levelName && a.color === b.color),
    );
};

const EMPTY_FIELDS: PropertyFieldModel[] = [];

/**
 * Whether channel attributes are available on this server.
 *
 * Gated on the ChannelAttributes flag and an Enterprise Advanced licence. A
 * server that predates the flag does not send it, so the flag read doubles as
 * the version gate and no version constant is needed.
 *
 * Note this is stricter than the server, which gates the access_control group at
 * Enterprise tier. The tighter tier is a product decision; making the two agree
 * needs a feature-scoped check server-side, because the group hook is shared
 * with Custom Profile Attributes and Classification Markings.
 */
export const observeChannelAttributesEnabled = (database: Database) => {
    const flag = observeConfigBooleanValue(database, 'FeatureFlagChannelAttributes', false);
    const isLicensed = observeIsMinimumLicenseTier(database, License.SKU_SHORT_NAME.EnterpriseAdvanced);

    return combineLatest([flag, isLicensed]).pipe(
        map(([enabled, licensed]) => enabled && licensed),
        distinctUntilChanged(),
    );
};

/**
 * The resolved id of the access_control property group, or '' before anything has
 * learned it. Persisted in the System table, so it survives a restart and is
 * available offline.
 */
export const observeAccessControlGroupId = (database: Database) => {
    return database.get<SystemModel>(SYSTEM).query(
        Q.where('id', SYSTEM_IDENTIFIERS.ACCESS_CONTROL_GROUP_ID),
    ).observeWithColumns(['value']).pipe(
        map((systems) => (systems[0]?.value as string | undefined) ?? ''),
        distinctUntilChanged(),
    );
};

export const getAccessControlGroupId = async (database: Database) => {
    const systems = await database.get<SystemModel>(SYSTEM).query(
        Q.where('id', SYSTEM_IDENTIFIERS.ACCESS_CONTROL_GROUP_ID),
    ).fetch();

    return (systems[0]?.value as string | undefined) ?? '';
};

/**
 * Every channel attribute definition, scoped to the access_control group.
 *
 * The group scope is not optional. Property rows carry a group_id but nothing
 * maps a group name to it locally, and managed channel categories also stores
 * channel-object fields in this table — so filtering on object_type alone would
 * treat a sidebar category field as a channel attribute.
 */
export const observeChannelAttributeFields = (database: Database) => {
    return observeAccessControlGroupId(database).pipe(
        switchMap((groupId) => {
            if (!groupId) {
                return of$(EMPTY_FIELDS);
            }

            return database.get<PropertyFieldModel>(PROPERTY_FIELD).query(
                Q.where('group_id', groupId),
                Q.where('object_type', CHANNEL_ATTRIBUTE_OBJECT_TYPE),
                Q.where('delete_at', 0),
            ).observeWithColumns(['update_at', 'delete_at', 'attrs']);
        }),
    );
};

/**
 * Every channel attribute paired with this channel's value, in display order.
 *
 * Ordering happens in JS rather than in the query: attrs is a JSON string column,
 * so sort_order is not reachable from SQL.
 */
export const observeResolvedChannelAttributes = (
    database: Database,
    channelId: string,
): Observable<ResolvedChannelAttribute[]> => {
    return combineLatest([
        observeChannelAttributeFields(database),
        observePropertyValuesByTargetId(database, channelId),
    ]).pipe(
        map(([fields, values]) => resolveChannelAttributes(fields, values)),
        distinctUntilChanged(resolvedAttributesEqual),
    );
};

export const observeChannelAttributeBanner = (
    database: Database,
    channelId: string,
    nativeBannerText?: string,
    authoredColor?: string,
): Observable<ChannelAttributeBannerState> => {
    return combineLatest([
        observeChannelAttributeFields(database),
        observePropertyValuesByTargetId(database, channelId),
        observeChannelAttributesEnabled(database),
    ]).pipe(
        map(([fields, values, attributesEnabled]) => deriveChannelAttributeBanner(fields, values, nativeBannerText, authoredColor, attributesEnabled)),
        distinctUntilChanged((a, b) => a.hasBanner === b.hasBanner &&
            a.banner?.text === b.banner?.text &&
            a.banner?.background_color === b.banner?.background_color),
    );
};

/**
 * Everything the downstream surfaces read, as one string per attribute.
 *
 * The configuration keys have to be in here, not just the rendered value: which
 * surface an attribute appears on is decided *after* this comparator runs, by
 * selectAttributesForAction and selectChannelInfoAttributes reading attrs.actions
 * and attrs.required. Comparing only the value meant an administrator unticking
 * "show in header" produced an emission this treated as identical, so the chip
 * stayed on screen until the app restarted.
 */
function renderSignature(attribute: ResolvedChannelAttribute): string {
    const {attrs} = attribute.field;
    const actions = Array.isArray(attrs?.actions) ? attrs.actions.join(',') : '';

    return [
        attribute.field.id,
        attribute.field.name,
        attribute.displayValue,
        attribute.option?.color ?? '',
        actions,
        attrs?.required === true ? '1' : '0',
        attrs?.display_name ?? '',
        typeof attrs?.sort_order === 'number' ? String(attrs.sort_order) : '',
    ].join('|');
}

function resolvedAttributesEqual(a: ResolvedChannelAttribute[], b: ResolvedChannelAttribute[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((attribute, index) => renderSignature(attribute) === renderSignature(b[index]));
}

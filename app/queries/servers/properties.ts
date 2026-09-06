// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {combineLatest, of as of$, type Observable} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {License} from '@constants';
import {CHANNEL_ATTRIBUTE_OBJECT_TYPE, FEATURE_FLAG_CHANNEL_ATTRIBUTES} from '@constants/channel_attributes';
import {
    CLASSIFICATIONS_FIELD_NAME,
    CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID,
    FEATURE_FLAG_CLASSIFICATION_MARKINGS,
} from '@constants/classification';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {
    deriveChannelAttributeBanner,
    resolveChannelAttributes,
    type ChannelAttributeBannerState,
    type ResolvedChannelAttribute,
} from '@utils/channel_attributes';
import {deriveClassificationBannerState} from '@utils/classification';

import {getConfigValue, observeConfigBooleanValue, observeIsMinimumLicenseTier} from './system';

import type {PropertyFieldModel, PropertyValueModel, SystemModel} from '@database/models/server';

const {SERVER: {PROPERTY_FIELD, PROPERTY_VALUE, SYSTEM}} = MM_TABLES;

// ASCII unit separator. Joins per-attribute signatures with a byte no option name,
// field name or colour can contain, so no value can forge a record boundary and
// make two different configurations hash alike.
export const SIGNATURE_SEPARATOR = '\u001f';

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

/**
 * Returns true when at least one of the two access_control features is on.
 *
 * A pure DB read — no remote I/O — so it belongs in the query layer rather than
 * in the remote action file that imports it.
 */
export const isAccessControlPropertiesEnabled = async (database: Database) => {
    const [classification, channelAttributes] = await Promise.all([
        getConfigValue(database, FEATURE_FLAG_CLASSIFICATION_MARKINGS),
        getConfigValue(database, FEATURE_FLAG_CHANNEL_ATTRIBUTES),
    ]);

    return classification === 'true' || channelAttributes === 'true';
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

            // permission_values is its own column, not part of attrs, so it has
            // to be listed: relying on update_at moving would miss a patch that
            // lands in the same millisecond as the last one.
            ).observeWithColumns(['update_at', 'delete_at', 'attrs', 'permission_values']);
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
        map(([fields, values]) => {
            const attributes = resolveChannelAttributes(fields, values);

            // The signature is computed here, not inside distinctUntilChanged.
            // WatermelonDB updates a record in place and re-emits the same model
            // instance, so by the time a comparator ran, the *previous* emission's
            // field already reported the new attrs and every comparison of a
            // configuration change came out equal. Snapshotting it as a string at
            // emission time is what makes the comparison mean anything.
            return {attributes, signature: attributes.map(renderSignature).join(SIGNATURE_SEPARATOR)};
        }),
        distinctUntilChanged((a, b) => a.signature === b.signature),
        map(({attributes}) => attributes),
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

    // The option list is in here as a digest rather than by identity because it
    // is what the editor offers. An administrator renaming, recolouring or
    // removing an option has to reach an open row, and comparing only the
    // rendered value meant the row kept offering an option the server had
    // already stopped accepting. Joined with SIGNATURE_SEPARATOR rather than
    // ':'/',' because option.name is admin-authored free text that can legally
    // contain either, which would let two different option sets collide.
    const options = Array.isArray(attrs?.options) ?attrs.options.map((option) => [option.id, option.rank ?? '', option.color ?? '', option.name].join(SIGNATURE_SEPARATOR)).join(SIGNATURE_SEPARATOR) :'';

    return [
        attribute.field.id,
        attribute.field.name,
        attribute.field.type,
        attribute.displayValue,

        // The raw stored value, not just the rendered display string: two options
        // that happen to share a name and colour render identical display values,
        // and without this, picking one over the other produced an emission this
        // treated as unchanged.
        JSON.stringify(attribute.rawValue ?? null),
        attribute.option?.color ?? '',
        actions,
        attrs?.required === true ? '1' : '0',
        attrs?.display_name ?? '',
        typeof attrs?.sort_order === 'number' ? String(attrs.sort_order) : '',

        // The three keys the editor gates on. Without them, narrowing a policy or
        // revoking a tier produced an emission this treated as identical.
        attrs?.change_policy ?? '',
        attrs?.editable === false ? '0' : '1',
        typeof attribute.field.permissionValues === 'string' ? attribute.field.permissionValues : '',
        options,
    ].join('|');
}

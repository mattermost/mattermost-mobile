// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    DISPLAY_BANNER_BOTTOM,
    DISPLAY_BANNER_TOP,
    OPTION_BACKED_FIELD_TYPES,
    SIGNATURE_SEPARATOR,
} from '@constants/channel_attributes';
import {CLASSIFICATIONS_FIELD_NAME} from '@constants/classification';

import type {PropertyFieldModel, PropertyValueModel} from '@database/models/server';

// Minimal structural shapes that both the WatermelonDB models and plain API
// payloads satisfy, so the same pure helpers serve the observers and the tests.
// Selection by group, object_type and delete_at happens in the scoped queries in
// @queries/servers/properties; these helpers only project what was selected.
// `type` and `permissionValues` are here for the editor: the first decides
// whether an editor exists for the field at all, the second is the per-field
// permission tier layered above the channel-level one.
export type ChannelAttributeField = Pick<PropertyFieldModel, 'id' | 'name' | 'type' | 'attrs' | 'permissionValues'>;
export type ChannelAttributeValue = Pick<PropertyValueModel, 'fieldId' | 'value'>;

export type ResolvedChannelAttribute = {
    field: ChannelAttributeField;

    // The channel's raw stored value, absent when the attribute is unset.
    rawValue?: unknown;

    // Resolved option for select-shaped fields. Absent for text fields, and for
    // a stored option id that no longer exists on the field.
    option?: PropertyFieldOption;

    // Display string, empty when the attribute is unset. For a multi-valued
    // attribute this is every value joined, kept for surfaces that render plain
    // text (the banner).
    displayValue: string;

    // One entry per underlying value, in order, each with its own resolved
    // color when the field is options-bearing. A single-valued attribute has
    // one entry; an unset attribute has none. Chip-rendering surfaces should
    // render one chip per entry instead of collapsing to displayValue, so a
    // multiselect or graph attribute shows each value as its own chip.
    displayValues: Array<{value: string; color?: string}>;

    // Option ids that no longer resolve on an options-bearing field.
    unresolvedOptionIds?: string[];
};

// Why a row cannot be edited. Shown to the user rather than hidden: a row that
// silently does nothing when tapped reads as broken, and hiding it makes a
// correctly marked channel look like one missing a marking.
export type AttributeLockReason = 'never' | 'raise_only' | 'lower_only' | 'permission' | 'unsupported_type';

export type AttributeEditability =
    | {editable: true}
    | {editable: false; reason: AttributeLockReason};

// What a field's permission_values tier requires beyond the channel-level gate.
export type AttributeTierGate = 'never' | 'channel_only' | 'manage_channel_roles' | 'manage_system';

// The channel-wide permission answers every row is judged against.
export type ChannelAttributePermissions = {
    canManageChannelProperties: boolean;
    canManageChannelRoles: boolean;
    canManageSystem: boolean;
};

export type ChannelAttributeBannerState = {
    hasBanner: boolean;
    banner: ChannelBannerInfo | undefined;

    // The channel's own banner_info text with its template resolved, for when
    // no designated attribute produces a banner and the native one shows.
    nativeText?: string;
};

const NO_BANNER: ChannelAttributeBannerState = {hasBanner: false, banner: undefined};

const EMPTY_RESOLVED: ResolvedChannelAttribute[] = [];

const EMPTY_OPTIONS: PropertyFieldOption[] = [];

const EDITABLE: AttributeEditability = {editable: true};

// The field types with an editor. Mirrors the webapp, which leaves date, user and
// multiuser read-only.
const EDITABLE_FIELD_TYPES = new Set<string>(['text', 'select', 'multiselect', 'rank']);

// Ranks a field for display. Absent sort_order sorts last rather than first, so
// an unconfigured field never jumps ahead of a configured one.
const NO_SORT_ORDER = Number.MAX_SAFE_INTEGER;

const DEFAULT_BANNER_COLOR = '#DDDDDD';

function getFieldOptions(field: ChannelAttributeField): PropertyFieldOption[] {
    return field.attrs?.options ?? [];
}

/**
 * Whether a stored value counts as set. Null, an empty string, and an empty
 * list all count as unset.
 */
export function isPropertyValueSet(raw: unknown): boolean {
    if (raw === null || raw === undefined || raw === '') {
        return false;
    }
    return !(Array.isArray(raw) && raw.length === 0);
}

/**
 * The value that clears a field: an empty list for list-valued types, an empty
 * string otherwise. Never null — on iOS the native bridge drops null-valued keys,
 * so {value: null} reaches the server as an item with no value and is rejected.
 * The server reads "" and [] as unset just as it does null.
 */
export function getEmptyPropertyValue(fieldType: PropertyFieldType): string | string[] {
    return fieldType === 'multiselect' || fieldType === 'multiuser' ? [] : '';
}

/**
 * Drops draft values a live field-list update has stranded: a field that no
 * longer appears at all, or a selected option id an administrator has since
 * removed from the field.
 *
 * Only the channel-creation form needs this. It holds its draft as local
 * component state rather than a persisted value, and the field list it draws
 * from is a live subscription — unlike Channel Info, where every write goes
 * straight to the server and is judged against the live field there instead.
 * Without this, a draft option id that stopped existing between the pick and
 * the tap on Create would still be sent, for the server to reject with no
 * option even reachable in the sheet's own picker to explain why.
 *
 * Returns the same object when nothing changed, so a caller storing this in
 * React state does not re-render on every unrelated field-list emission.
 */
export function pruneStaleAttributeValues(
    fields: ChannelAttributeField[],
    values: Record<string, string | string[]>,
): Record<string, string | string[]> {
    const fieldById = new Map(fields.map((field) => [field.id, field]));
    let changed = false;
    const next: Record<string, string | string[]> = {};

    for (const [fieldId, value] of Object.entries(values)) {
        const field = fieldById.get(fieldId);
        if (!field || !OPTION_BACKED_FIELD_TYPES.has(field.type)) {
            if (field) {
                next[fieldId] = value;
            } else {
                changed = true;
            }
            continue;
        }

        const validIds = new Set(getFieldOptions(field).map((option) => option.id));
        let kept: string | string[] | undefined;
        if (Array.isArray(value)) {
            kept = value.filter((id) => validIds.has(id));
        } else if (validIds.has(value)) {
            kept = value;
        }

        if (kept === undefined || (Array.isArray(kept) && kept.length === 0)) {
            changed = true;
            continue;
        }
        if (Array.isArray(kept) && kept.length !== value.length) {
            changed = true;
        }
        next[fieldId] = kept;
    }

    return changed ? next : values;
}

/**
 * Anything non-boolean predates the server-side validation of this key, so it
 * reads as not required rather than being guessed at.
 */
export function isPropertyFieldRequired(field: ChannelAttributeField): boolean {
    return field.attrs?.required === true;
}

/**
 * display_name is the admin-facing override; name is the CEL-safe slug fallback.
 *
 * The server does not copy display_name onto a linked channel field, so in
 * practice this returns the machine name for channel attributes.
 */
export function getPropertyFieldLabel(field: ChannelAttributeField): string {
    const displayName = field.attrs?.display_name;
    return displayName || field.name;
}

/**
 * change_policy wins when present. An explicit editable=false reads as "never"
 * so fields written before the key keep their behaviour. Anything unrecognised
 * falls back to the permissive default.
 */
export function getPropertyFieldChangePolicy(field: ChannelAttributeField): PropertyChangePolicy {
    const policy = field.attrs?.change_policy;
    if (policy === 'never' || policy === 'raise_only' || policy === 'lower_only' || policy === 'any') {
        return policy;
    }
    if (field.attrs?.editable === false) {
        return 'never';
    }
    return 'any';
}

/**
 * The server normalises rank fields to a contiguous 1..N, so the positional
 * fallback only covers option lists cached before that ran.
 */
export function getOptionRank(field: ChannelAttributeField, optionId: string): number | undefined {
    const options = getFieldOptions(field);
    const index = options.findIndex((option) => option.id === optionId);
    if (index < 0) {
        return undefined;
    }
    const {rank} = options[index];
    return typeof rank === 'number' ? rank : index + 1;
}

/**
 * Whether the field's change policy permits moving from its current value to the
 * given option. Higher rank is higher, matching the server.
 *
 * An unset value may move anywhere: the policy governs changes, not the first
 * write, so a required-and-locked attribute whose creation-time write failed
 * stays fillable. A rank that cannot be resolved on either side fails closed —
 * an unresolvable comparison on a marking must not read as permitted.
 */
export function canMoveToOption(field: ChannelAttributeField, currentValue: unknown, optionId: string): boolean {
    if (!isPropertyValueSet(currentValue)) {
        return true;
    }

    const policy = getPropertyFieldChangePolicy(field);
    if (policy === 'any') {
        return true;
    }
    if (policy === 'never') {
        return false;
    }

    const currentId = typeof currentValue === 'string' ? currentValue : undefined;
    if (!currentId) {
        return false;
    }

    const currentRank = getOptionRank(field, currentId);
    const nextRank = getOptionRank(field, optionId);
    if (currentRank === undefined || nextRank === undefined) {
        return false;
    }

    return policy === 'raise_only' ? nextRank > currentRank : nextRank < currentRank;
}

/**
 * The options a field's change policy still permits, given its current value.
 *
 * The editor narrows its list to these rather than rendering the rest disabled:
 * under a directional policy the unreachable options are not choices, and showing
 * them greyed out only invites the tap.
 */
export function reachableOptions(field: ChannelAttributeField, currentValue: unknown): PropertyFieldOption[] {
    const options = getFieldOptions(field);
    if (options.length === 0) {
        return EMPTY_OPTIONS;
    }

    const reachable = options.filter((option) => canMoveToOption(field, currentValue, option.id));
    return reachable.length === options.length ? options : reachable;
}

/**
 * Whether this field's type has an editor at all.
 *
 * date, user and multiuser attributes are displayed but not editable — there is
 * no editor for them on the webapp either, and inventing one on a phone first is
 * the wrong order.
 */
export function hasAttributeEditor(field: ChannelAttributeField): boolean {
    return EDITABLE_FIELD_TYPES.has(field.type);
}

/**
 * What this field's permission_values tier demands, on top of the channel-level
 * manage_*_channel_properties gate.
 *
 * Anything absent or unrecognised reads as `never`, which matches the server: its
 * switch has no default branch and a nil tier returns false. The webapp instead
 * treats an empty tier as `member`, so it offers an edit affordance the server
 * refuses — deliberately not copied here.
 *
 * A tier is returned rather than a permission name because the permissions have
 * to be observed for the channel as a whole: one subscription each, then every
 * row selects from the result, instead of a subscription per row.
 */
export function attributeTierGate(field: ChannelAttributeField): AttributeTierGate {
    switch (field.permissionValues) {
        case 'sysadmin':
            return 'manage_system';
        case 'admin':
            return 'manage_channel_roles';
        case 'member':
            return 'channel_only';
        default:
            return 'never';
    }
}

/**
 * Whether the caller may set this field while creating a channel, mirroring the
 * server's canSetChannelAttributeOnCreate (api4/channel.go).
 *
 * The channel does not exist yet, so there is no channel-level gate to check —
 * only the field's own tier, answered from what creation itself guarantees: the
 * creator is saved as a channel admin, which satisfies both `member` and `admin`.
 * Only `sysadmin` needs anything beyond that. Anything absent or unrecognised
 * fails closed, matching the server's switch having no default branch.
 */
export function canSetChannelAttributeOnCreate(field: ChannelAttributeField, canManageSystem: boolean): boolean {
    switch (field.permissionValues) {
        case 'member':
        case 'admin':
            return true;
        case 'sysadmin':
            return canManageSystem;
        default:
            return false;
    }
}

export type ChannelAttributeCreateFlags = {

    // FeatureFlagChannelAttributesRequired, on top of channel attributes being enabled.
    requiredEnforced: boolean;

    // FeatureFlagClassificationMarkings.
    classificationAvailable: boolean;
};

// Matched by name, as in deriveChannelAttributeBanner and for the same reason:
// mobile does not persist linked_field_id, and the server allows only one live
// channel field per name in the group.
function isClassificationField(field: ChannelAttributeField): boolean {
    return field.name === CLASSIFICATIONS_FIELD_NAME;
}

// Mirrors the server's channelAttributeFieldAvailable: it refuses a value for
// the classification field while its feature is off, so offering it would only
// lead to a 400.
function isFieldAvailableOnCreate(field: ChannelAttributeField, classificationAvailable: boolean): boolean {
    return classificationAvailable || !isClassificationField(field);
}

function isOfferableOnCreate(field: ChannelAttributeField, canManageSystem: boolean): boolean {
    return hasAttributeEditor(field) && canSetChannelAttributeOnCreate(field, canManageSystem);
}

// A plain copy, never the WatermelonDB model with its attrs changed in place.
function asOptionalField(field: ChannelAttributeField): ChannelAttributeField {
    return {
        id: field.id,
        name: field.name,
        type: field.type,
        permissionValues: field.permissionValues,
        attrs: {...field.attrs, required: false},
    };
}

/**
 * The fields the channel-creation form should offer, in display order.
 *
 * With required attributes enforced: the required ones with a mobile editor that
 * the caller may set on create. With the kill switch engaged the server demands
 * nothing, so only classification is offered, as an optional copy, matching the
 * webapp's courtesy exception. Every other field stays hidden, and a stored
 * required=true no longer forces a value.
 */
export function getCreatableChannelAttributeFields(
    fields: ChannelAttributeField[],
    canManageSystem: boolean,
    {requiredEnforced, classificationAvailable}: ChannelAttributeCreateFlags,
): ChannelAttributeField[] {
    const available = fields.filter((field) => isFieldAvailableOnCreate(field, classificationAvailable) && isOfferableOnCreate(field, canManageSystem));

    if (!requiredEnforced) {
        return available.filter(isClassificationField).map(asOptionalField);
    }

    return available.
        filter(isPropertyFieldRequired).
        sort(compareChannelAttributeFields);
}

/**
 * Whether some field the server will require from this caller (required, and the caller's
 * tier passes canSetChannelAttributeOnCreate) but that has no mobile editor at
 * all. The create form drops it for the same reason a sysadmin-only field is
 * dropped — there is nothing to render — but unlike the sysadmin case the server
 * does *not* also skip the requirement here, since the tier check passes. Left
 * undetected, the create screen would let Create be tapped with no way to have
 * supplied a value the server then rejects.
 *
 * Never true with the kill switch engaged, and never for a field whose feature is
 * off: the server requires neither.
 */
export function hasCreationBlockingChannelAttribute(
    fields: ChannelAttributeField[],
    canManageSystem: boolean,
    {requiredEnforced, classificationAvailable}: ChannelAttributeCreateFlags,
): boolean {
    if (!requiredEnforced) {
        return false;
    }

    return fields.some((field) => isPropertyFieldRequired(field) &&
        isFieldAvailableOnCreate(field, classificationAvailable) &&
        !hasAttributeEditor(field) &&
        canSetChannelAttributeOnCreate(field, canManageSystem));
}

export function channelAttributePermissionsEqual(a: ChannelAttributePermissions, b: ChannelAttributePermissions): boolean {
    return a.canManageChannelProperties === b.canManageChannelProperties &&
        a.canManageChannelRoles === b.canManageChannelRoles &&
        a.canManageSystem === b.canManageSystem;
}

/**
 * Both permission gates for one field: the channel-level one, already resolved by
 * the caller, and this field's tier.
 */
export function canEditAttributeField(field: ChannelAttributeField, permissions: ChannelAttributePermissions): boolean {
    if (!permissions.canManageChannelProperties) {
        return false;
    }

    switch (attributeTierGate(field)) {
        case 'channel_only':
            return true;
        case 'manage_channel_roles':
            return permissions.canManageChannelRoles;
        case 'manage_system':
            return permissions.canManageSystem;
        default:
            return false;
    }
}

/**
 * Whether a row may be edited, and when it may not, which of the reasons to show.
 *
 * `hasPermission` is both permission gates already resolved: the channel-level
 * one and this field's tier.
 *
 * Two details are easy to get wrong and both are load-bearing:
 *
 * - The check reads the stored value, not the display string. A stored option id
 *   that no longer resolves still counts as set, and — being unresolvable — is
 *   correctly refused by canMoveToOption.
 * - A locked policy only locks a field that already has a value. The server
 *   exempts the first write, so a required attribute whose creation-time write
 *   failed is not stranded as "Not set" forever.
 */
export function getAttributeEditability(
    field: ChannelAttributeField,
    currentValue: unknown,
    hasPermission: boolean,
): AttributeEditability {
    if (!hasAttributeEditor(field)) {
        return {editable: false, reason: 'unsupported_type'};
    }

    // The policy is checked before the permission, so a locked field reports why it
    // is locked even to someone who could not have edited it anyway. That reason
    // describes the channel rather than the viewer, and it is the more useful of
    // the two: "cannot be changed after it is set" explains the row, where "you do
    // not have permission" only explains the reader.
    if (isPropertyValueSet(currentValue)) {
        const policy = getPropertyFieldChangePolicy(field);

        if (policy === 'never') {
            return {editable: false, reason: 'never'};
        }

        // A directional policy compares option ranks, so a field with nothing left
        // to compare can never satisfy it. The server reaches the same conclusion
        // from the other side: an unresolvable rank is refused. That also covers a
        // text field, which only ends up here through a type change.
        if (policy !== 'any' && reachableOptions(field, currentValue).length === 0) {
            return {editable: false, reason: policy};
        }
    }

    if (!hasPermission) {
        return {editable: false, reason: 'permission'};
    }

    return EDITABLE;
}

/**
 * Orders fields for display: attrs.sort_order ascending, ties broken by name.
 *
 * The locale is pinned to 'en' deliberately. The default is the viewer's, which
 * would order equal-ranked chips differently per user, and chip order is
 * something people are told to read. Names are ASCII slugs, so this is total.
 *
 * Nothing writes sort_order today — the System Console has no control for it —
 * so in practice the name tie-break decides every comparison.
 */
export function compareChannelAttributeFields(a: ChannelAttributeField, b: ChannelAttributeField): number {
    const rankA = typeof a.attrs?.sort_order === 'number' ? a.attrs.sort_order : NO_SORT_ORDER;
    const rankB = typeof b.attrs?.sort_order === 'number' ? b.attrs.sort_order : NO_SORT_ORDER;
    if (rankA !== rankB) {
        return rankA - rankB;
    }
    return a.name.localeCompare(b.name, 'en');
}

function resolveDisplayValue(field: ChannelAttributeField, raw: unknown): Pick<ResolvedChannelAttribute, 'option' | 'displayValue' | 'displayValues' | 'unresolvedOptionIds'> {
    if (!isPropertyValueSet(raw)) {
        return {displayValue: '', displayValues: []};
    }

    const options = getFieldOptions(field);
    const optionsBearing = OPTION_BACKED_FIELD_TYPES.has(field.type);

    if (Array.isArray(raw)) {
        const unresolvedOptionIds: string[] = [];
        const displayValues = raw.map((id) => {
            const option = options.find((candidate) => candidate.id === id);
            if (option === undefined && optionsBearing) {
                unresolvedOptionIds.push(String(id));
            }
            return {value: option?.name ?? String(id), color: option?.color};
        });
        return {
            displayValue: displayValues.map((entry) => entry.value).join(', '),
            displayValues,
            unresolvedOptionIds: unresolvedOptionIds.length > 0 ? unresolvedOptionIds : undefined,
        };
    }

    if (typeof raw !== 'string') {
        const value = String(raw);
        return {displayValue: value, displayValues: [{value}]};
    }

    const option = options.find((candidate) => candidate.id === raw);
    if (option) {
        return {option, displayValue: option.name, displayValues: [{value: option.name, color: option.color}]};
    }

    // Text fields store the display string directly. A select field whose option
    // was deleted lands here too and renders the raw id, which is wrong but
    // visible — better than silently dropping a marking.
    return {
        displayValue: raw,
        displayValues: [{value: raw}],
        unresolvedOptionIds: optionsBearing ? [raw] : undefined,
    };
}

/**
 * Every channel attribute paired with this channel's value, in display order.
 *
 * Fields with no value are included with an empty displayValue, so each surface
 * decides whether to render them: the header omits them, Channel Info keeps the
 * required ones so an incomplete channel is visible.
 */
export function resolveChannelAttributes(
    fields: ChannelAttributeField[],
    values: ChannelAttributeValue[],
): ResolvedChannelAttribute[] {
    if (fields.length === 0) {
        return EMPTY_RESOLVED;
    }

    const valueByFieldId = new Map<string, unknown>();
    for (const value of values) {
        valueByFieldId.set(value.fieldId, value.value);
    }

    return [...fields].sort(compareChannelAttributeFields).map((field) => {
        const rawValue = valueByFieldId.get(field.id);
        return {field, rawValue, ...resolveDisplayValue(field, rawValue)};
    });
}

/**
 * The attributes designated for one display action, with a value to show.
 *
 * An attribute designated for display but unset is omitted: a chip with nothing
 * in it says nothing.
 */
export function selectAttributesForAction(
    attributes: ResolvedChannelAttribute[],
    action: PropertyFieldAction,
): ResolvedChannelAttribute[] {
    const selected = attributes.filter((attribute) => {
        if (!attribute.displayValue) {
            return false;
        }
        return hasAction(attribute.field, action);
    });
    return selected.length === 0 ? EMPTY_RESOLVED : selected;
}

/**
 * The attributes listed in Channel Info, filtered by role not by display configuration.
 *
 * Display configuration (attrs.actions / display_label_info) controls only the
 * chip/banner surfaces. Channel Info is the editing surface, so it must show every
 * attribute the viewer can act on — hiding a value because an admin did not tick
 * "show in info panel" would leave a channel admin with no way to correct it.
 *
 * Required-and-unset rows are shown per field, not per a single "is this user a
 * channel admin" boolean: a custom role can hold manage_public/private_channel_
 * properties and edit a member-tier field without holding manage_channel_roles,
 * and that user must still see the only row that lets them complete it. Each
 * field's own effective editability (canEditAttributeField) decides, not the
 * channel-role permission alone.
 *
 * Any attribute with a stored value is listed regardless of who can edit it —
 * read-only for a viewer who cannot act on it.
 *
 * Optional unset attributes are reached through Add Attribute (a later story).
 *
 * "Has a stored value" is tested against rawValue (server semantics: null / '' / []
 * all count as unset) rather than displayValue, so a stored id that no longer
 * resolves to an option is still counted as set and the row is the only way to reach
 * it.
 */
export function selectChannelInfoAttributes(
    attributes: ResolvedChannelAttribute[],
    permissions: ChannelAttributePermissions,
): ResolvedChannelAttribute[] {
    const listed = attributes.filter((attribute) => {
        if (isPropertyValueSet(attribute.rawValue)) {
            return true;
        }
        return isPropertyFieldRequired(attribute.field) && canEditAttributeField(attribute.field, permissions);
    });
    return listed.length === 0 ? EMPTY_RESOLVED : listed;
}

export type ChannelAttributeChipItem = {
    key: string;
    fieldId: string;
    label: string;
    value: string;
    color?: string;
    testID: string;
};

/**
 * Flattens every attribute's values into individual chip items, one per value,
 * so a caller can cap overflow by chip count rather than attribute count. An
 * attribute with a single value keeps the bare `{testIDPrefix}.{field.name}`
 * testID it has always used; an attribute with several values gets an index
 * suffix per chip so each one stays addressable.
 */
export function flattenChannelAttributesToChips(attributes: ResolvedChannelAttribute[], testIDPrefix: string): ChannelAttributeChipItem[] {
    return attributes.flatMap((attribute) => {
        const label = getPropertyFieldLabel(attribute.field);
        const multiValue = attribute.displayValues.length > 1;
        return attribute.displayValues.map((entry, index) => ({
            key: `${attribute.field.id}-${index}`,
            fieldId: attribute.field.id,
            label,
            value: entry.value,
            color: entry.color,
            testID: multiValue ? `${testIDPrefix}.${attribute.field.name}.${index}` : `${testIDPrefix}.${attribute.field.name}`,
        }));
    });
}

export type ChannelAttributeChipGroup = {
    fieldId: string;
    label: string;
    items: ChannelAttributeChipItem[];
};

/**
 * Groups chip items back by field, in order, so a caller can render one row
 * per field with every value of that field as its own chip.
 */
export function groupChannelAttributeChipsByField(items: ChannelAttributeChipItem[]): ChannelAttributeChipGroup[] {
    const groups: ChannelAttributeChipGroup[] = [];
    const byFieldId = new Map<string, ChannelAttributeChipGroup>();
    for (const item of items) {
        let group = byFieldId.get(item.fieldId);
        if (!group) {
            group = {fieldId: item.fieldId, label: item.label, items: []};
            byFieldId.set(item.fieldId, group);
            groups.push(group);
        }
        group.items.push(item);
    }
    return groups;
}

/**
 * Everything the downstream surfaces read, as one string per attribute.
 *
 * The configuration keys have to be in here, not just the rendered value: which
 * surface an attribute appears on is decided *after* this comparator runs, by
 * selectAttributesForAction and selectChannelInfoAttributes reading attrs.actions
 * and attrs.required. Lives with the helpers it mirrors, since it touches no
 * database; the observers in @queries/servers/properties only apply it. Comparing
 * only the value meant an administrator unticking "show in header" produced an
 * emission this treated as identical, so the chip stayed on screen until the app
 * restarted.
 */
function renderSignature(attribute: ResolvedChannelAttribute): string {
    const {attrs} = attribute.field;
    const actions = Array.isArray(attrs?.actions) ? attrs.actions.join(',') : '';

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

        // Multi-valued attributes carry per-value colors, never an option, so
        // an option color change only shows up here.
        attribute.displayValues.map((entry) => entry.color ?? '').join(','),
        attribute.unresolvedOptionIds?.join(',') ?? '',
        actions,
        attrs?.required === true ? '1' : '0',
        attrs?.display_name ?? '',
        typeof attrs?.sort_order === 'number' ? String(attrs.sort_order) : '',
        ...editorSignatureKeys(attribute.field),
    ].join('|');
}

/**
 * The keys the editor gates on, plus the option list it offers.
 *
 * Without the first three, narrowing a policy or revoking a tier produced an
 * emission treated as identical. The option list is in here as a digest rather
 * than by identity because it is what the editor offers: an administrator
 * renaming, recolouring or removing an option has to reach an open row, and
 * comparing only the rendered value meant the row kept offering an option the
 * server had already stopped accepting. Joined with SIGNATURE_SEPARATOR rather
 * than ':'/',' because option.name is admin-authored free text that can legally
 * contain either, which would let two different option sets collide.
 */
function editorSignatureKeys(field: ChannelAttributeField): string[] {
    const {attrs} = field;

    return [
        attrs?.change_policy ?? '',
        attrs?.editable === false ? '0' : '1',
        typeof field.permissionValues === 'string' ? field.permissionValues : '',
        optionsSignature(field),
    ];
}

function optionsSignature(field: ChannelAttributeField): string {
    const {attrs} = field;
    return Array.isArray(attrs?.options) ? attrs.options.map((option) => [option.id, option.rank ?? '', option.color ?? '', option.name].join(SIGNATURE_SEPARATOR)).join(SIGNATURE_SEPARATOR) : '';
}

/**
 * One string standing for everything the chip, banner and Channel Info surfaces
 * read from a resolved attribute list.
 *
 * Callers must take this at emission time rather than comparing two lists inside
 * distinctUntilChanged. WatermelonDB updates a record in place and re-emits the
 * same model instance, so by the time a comparator ran, the *previous* emission's
 * field already reported the new attrs and every comparison of a configuration
 * change came out equal.
 */
export function resolvedAttributesSignature(attributes: ResolvedChannelAttribute[]): string {
    return attributes.map(renderSignature).join(SIGNATURE_SEPARATOR);
}

/**
 * What Channel Info renders and edits for one attribute. Narrower than
 * renderSignature on purpose: Channel Info lists attributes whatever their
 * display actions, so an administrator toggling "show in header" must not
 * re-render it. It still carries the stored value and every key the editor and
 * its submit-time revalidation read, since Channel Info is the editing surface.
 */
function channelInfoSignature(attribute: ResolvedChannelAttribute): string {
    return [
        attribute.field.id,
        attribute.field.name,
        attribute.field.type,
        getPropertyFieldLabel(attribute.field),
        JSON.stringify(attribute.rawValue ?? null),
        attribute.displayValues.map((entry) => [entry.value, entry.color ?? ''].join(SIGNATURE_SEPARATOR)).join(SIGNATURE_SEPARATOR),
        attribute.unresolvedOptionIds?.join(',') ?? '',
        isPropertyFieldRequired(attribute.field) ? '1' : '0',
        ...editorSignatureKeys(attribute.field),
    ].join('|');
}

/**
 * The Channel Info counterpart of resolvedAttributesSignature, under the same
 * rule: take it at emission time, never compare two lists after the fact.
 */
export function channelInfoAttributesSignature(attributes: ResolvedChannelAttribute[]): string {
    return attributes.map(channelInfoSignature).join(SIGNATURE_SEPARATOR);
}

// What the create form renders for one field, plus what decides whether the
// field is in the list at all (required flag, permission tier). Taken at
// emission time for the same reason as resolvedAttributesSignature: a field
// changed in place re-emits the same model instance.
function creatableFieldSignature(field: ChannelAttributeField): string {
    return [
        field.id,

        // The fallback label (getPropertyFieldLabel falls back to name when
        // display_name is absent), the sort tie-break, and every row testID are
        // all keyed off name, not just display_name.
        field.name,
        field.type,
        field.permissionValues ?? '',
        isPropertyFieldRequired(field) ? '1' : '0',
        field.attrs?.display_name ?? '',
        typeof field.attrs?.sort_order === 'number' ? String(field.attrs.sort_order) : '',
        optionsSignature(field),
    ].join(SIGNATURE_SEPARATOR);
}

/**
 * The create-form counterpart of resolvedAttributesSignature, under the same
 * rule: take it at emission time, never compare two lists after the fact.
 */
export function creatableFieldsSignature(fields: ChannelAttributeField[]): string {
    return fields.map(creatableFieldSignature).join('|');
}

function hasAction(field: ChannelAttributeField, action: PropertyFieldAction): boolean {
    const {actions} = field.attrs ?? {};
    return Array.isArray(actions) && actions.includes(action);
}

function hasBannerAction(field: ChannelAttributeField): boolean {
    return hasAction(field, DISPLAY_BANNER_TOP) || hasAction(field, DISPLAY_BANNER_BOTTOM);
}

/**
 * Whether a field predates any display configuration.
 *
 * The distinction is load-bearing. The System Console writes attrs.actions on
 * every save, empty array included, because the server merges attrs and an
 * omitted key keeps its previous value. So `[]` means an administrator looked at
 * this attribute and ticked nothing — which has to mean no banner — while an
 * absent key means nobody has configured it yet. Testing `actions.length` rather
 * than `Array.isArray` would resurrect the banner every time Banner is unticked.
 */
function hasNoDisplayConfiguration(field: ChannelAttributeField): boolean {
    return !Array.isArray(field.attrs?.actions);
}

/**
 * Resolves one channel banner from every attribute designated for that surface,
 * following the same rules as the webapp.
 *
 * Falls back to the classification field while that field carries no display
 * configuration at all, which is how an install that upgraded before an
 * administrator configured anything keeps the banner it has today. The fallback
 * switches off as soon as the field carries any actions, so an unticked Banner
 * means no banner.
 *
 * On the designated path the channel's own banner settings are honored: once a
 * channel has authored banner text, switching its banner off hides it whatever
 * attributes are designated, unless one of them is required. The authored text
 * wins over the designated default even when every attribute it references is
 * unset. Classification's color is enforced only while classification actually
 * appears on the banner; once the channel removes its token, the color is the
 * channel's.
 *
 * The classification field is matched by name because mobile does not persist
 * linked_field_id. That is sufficient rather than lax: the template field is
 * object_type='template' and the global field is 'system', so within the
 * channel-object fields the name is already unambiguous.
 *
 * @param fields channel-object fields in the access_control group, any order
 * @param values every property value on this channel
 * @param [bannerInfo] the channel's own banner_info: template, color and toggle
 * @param [attributesEnabled] whether the channel attributes feature is on
 */
export function deriveChannelAttributeBanner(
    fields: ChannelAttributeField[],
    values: ChannelAttributeValue[],
    bannerInfo?: ChannelBannerInfo,
    attributesEnabled = false,
): ChannelAttributeBannerState {
    const ordered = [...fields].sort(compareChannelAttributeFields);

    // With channel attributes off, only classification may produce a banner — it
    // ships on its own flag and predates this feature. Any other attribute
    // designating a banner is ignored until the feature it belongs to is enabled,
    // so a configured-but-disabled attribute cannot take over the channel banner.
    const candidates = attributesEnabled ? ordered : ordered.filter((field) => field.name === CLASSIFICATIONS_FIELD_NAME);

    const designatedFields = candidates.filter(hasBannerAction);
    const fallback = designatedFields.length > 0 ? undefined : candidates.find(
        (field) => field.name === CLASSIFICATIONS_FIELD_NAME && hasNoDisplayConfiguration(field),
    );

    if (designatedFields.length === 0 && !fallback) {
        return NO_BANNER;
    }

    const resolvedAttributes = resolveChannelAttributes(ordered, values);
    const templateAttributes = withoutUnresolvedOptions(resolvedAttributes);
    const authoredText = bannerInfo?.text;

    if (fallback) {
        const resolved = resolvedAttributes.find((attribute) => attribute.field.id === fallback.id);
        if (!resolved?.option?.name || resolved.unresolvedOptionIds?.length) {
            return NO_BANNER;
        }

        const text = authoredText ?
            renderBannerTemplate(authoredText, templateAttributes) :
            `**${resolved.option.name}**`;
        if (!text) {
            return NO_BANNER;
        }

        return {
            hasBanner: true,
            banner: {
                enabled: true,
                text,
                background_color: resolved.option.color || DEFAULT_BANNER_COLOR,
            },
        };
    }

    // A channel that never authored a banner carries enabled=false and still shows
    // the designated default, so the toggle only counts once text exists.
    const bannerRequired = designatedFields.some(isPropertyFieldRequired);
    if (authoredText !== undefined && !bannerInfo?.enabled && !bannerRequired) {
        return NO_BANNER;
    }

    const contributions = designatedFields.
        map((field) => resolvedAttributes.find((attribute) => attribute.field.id === field.id)).
        filter((attribute): attribute is ResolvedChannelAttribute => Boolean(
            attribute?.displayValue && !attribute.unresolvedOptionIds?.length,
        ));

    let text: string;
    if (authoredText !== undefined) {
        text = authoredText ? renderBannerTemplate(authoredText, templateAttributes) : '';
    } else if (contributions.length === 0) {
        return NO_BANNER;
    } else {
        text = contributions.map((attribute) => attribute.displayValue).join(' · ');
    }
    if (!text.trim()) {
        return NO_BANNER;
    }

    const classificationContribution = contributions.find((attribute) => attribute.field.name === CLASSIFICATIONS_FIELD_NAME);
    const classificationColor = classificationContribution?.option?.color;
    const classificationInBanner = Boolean(classificationColor) &&
        (authoredText === undefined || hasAttributeToken(authoredText, CLASSIFICATIONS_FIELD_NAME));

    let backgroundColor: string;
    if (classificationInBanner && classificationColor) {
        backgroundColor = classificationColor;
    } else {
        const colorContributions = contributions.filter((attribute) => attribute !== classificationContribution);
        backgroundColor = bannerInfo?.background_color ||
            (colorContributions.length === 1 ? colorContributions[0].option?.color : undefined) ||
            DEFAULT_BANNER_COLOR;
    }

    return {
        hasBanner: true,
        banner: {
            enabled: true,
            text,
            background_color: backgroundColor,
        },
    };
}

// A deleted option would otherwise render its raw id in the banner.
function withoutUnresolvedOptions(attributes: ResolvedChannelAttribute[]): ResolvedChannelAttribute[] {
    if (!attributes.some((attribute) => attribute.unresolvedOptionIds?.length)) {
        return attributes;
    }
    return attributes.map((attribute) => (attribute.unresolvedOptionIds?.length ? {...attribute, displayValue: '', displayValues: []} : attribute));
}

// Separators the banner composer offers. Excludes '-' and '/': a banner authored
// as "- {{classification}}" is a markdown list, and stripping its marker would
// rewrite what the author wrote.
const SEPARATORS = '·|';

const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * The channel's own banner_info text with its template resolved against this
 * channel's attribute values, matching the webapp.
 *
 * The native banner shows when no designated attribute has a value, and its
 * text is the same template the attribute banner renders, so without this an
 * unset attribute leaves its raw "{{name}}" token on screen. With channel
 * attributes off the text passes through untouched, as on the webapp.
 *
 * @param fields channel-object fields in the access_control group, any order
 * @param values every property value on this channel
 * @param [nativeBannerText] the channel's own banner_info.text template
 * @param [attributesEnabled] whether the channel attributes feature is on
 */
export function renderNativeBannerText(
    fields: ChannelAttributeField[],
    values: ChannelAttributeValue[],
    nativeBannerText?: string,
    attributesEnabled = false,
): string | undefined {
    if (!attributesEnabled || !nativeBannerText?.includes('{{')) {
        return nativeBannerText;
    }

    return renderBannerTemplate(nativeBannerText, resolveChannelAttributes(fields, values));
}

export function hasAttributeToken(text: string, fieldName: string): boolean {
    for (const match of text.matchAll(TOKEN_PATTERN)) {
        if (match[1] === fieldName) {
            return true;
        }
    }
    return false;
}

export function renderBannerTemplate(template: string, attributes: ResolvedChannelAttribute[]): string {
    if (!template || !template.includes('{{')) {
        return template;
    }

    const byName = new Map(attributes.map((attribute) => [attribute.field.name, attribute]));
    const substituted = template.replace(TOKEN_PATTERN, (_full, name: string) => {
        return byName.get(name)?.displayValue ?? '';
    });

    return tidySeparators(substituted);
}

/**
 * Removes unresolved `{{token}}` spans and tidies the punctuation they strand.
 *
 * This is a degradation guard, not a template renderer. banner_info.text arrives
 * already resolved from the server; a token surviving to the client means either
 * an older server or a re-resolve that has not run yet. Braces on screen are the
 * one outcome that cannot be defended, whereas an over-tidied banner is
 * recoverable, so the tokens go and the separators are cleaned up after them.
 */
export function stripUnresolvedTokens(text: string): string {
    if (!text.includes('{{')) {
        return text;
    }

    const stripped = text.replace(TOKEN_PATTERN, '');

    return tidySeparators(stripped);
}

function tidySeparators(text: string): string {
    const run = new RegExp(`(?:\\s*[${SEPARATORS}]\\s*){2,}`, 'g');
    const leading = new RegExp(`^[\\s${SEPARATORS}]+`);
    const trailing = new RegExp(`[\\s${SEPARATORS}]+$`);

    return text.
        replace(run, (match) => ` ${match.trim().charAt(0)} `).
        replace(leading, '').
        replace(trailing, '').
        replace(/\s{2,}/g, ' ');
}

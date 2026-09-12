// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    DISPLAY_BANNER_BOTTOM,
    DISPLAY_BANNER_TOP,
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

    // Display string, empty when the attribute is unset.
    displayValue: string;
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
};

const NO_BANNER: ChannelAttributeBannerState = {hasBanner: false, banner: undefined};

const EMPTY_RESOLVED: ResolvedChannelAttribute[] = [];

const EMPTY_OPTIONS: PropertyFieldOption[] = [];

const EDITABLE: AttributeEditability = {editable: true};

// The field types with an editor. Mirrors the webapp, which leaves date, user and
// multiuser read-only.
const EDITABLE_FIELD_TYPES = new Set<string>(['text', 'select', 'multiselect', 'rank']);

// The field types whose stored value is an option id rather than free text — the
// only ones a removed or renamed option can strand a draft against.
const OPTION_BACKED_FIELD_TYPES = new Set<string>(['select', 'multiselect', 'rank']);

// Ranks a field for display. Absent sort_order sorts last rather than first, so
// an unconfigured field never jumps ahead of a configured one.
const NO_SORT_ORDER = Number.MAX_SAFE_INTEGER;

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

function resolveDisplayValue(field: ChannelAttributeField, raw: unknown): Pick<ResolvedChannelAttribute, 'option' | 'displayValue'> {
    if (!isPropertyValueSet(raw)) {
        return {displayValue: ''};
    }

    const options = getFieldOptions(field);

    if (Array.isArray(raw)) {
        const names = raw.map((id) => options.find((option) => option.id === id)?.name ?? String(id));
        return {displayValue: names.join(', ')};
    }

    if (typeof raw !== 'string') {
        return {displayValue: String(raw)};
    }

    const option = options.find((candidate) => candidate.id === raw);
    if (option) {
        return {option, displayValue: option.name};
    }

    // Text fields store the display string directly. A select field whose option
    // was deleted lands here too and renders the raw id, which is wrong but
    // visible — better than silently dropping a marking.
    return {displayValue: raw};
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
 * Resolves the channel banner from whichever attribute designates one.
 *
 * Falls back to the classification field while that field carries no display
 * configuration at all, which is how an install that upgraded before an
 * administrator configured anything keeps the banner it has today. The fallback
 * switches off as soon as the field carries any actions, so an unticked Banner
 * means no banner.
 *
 * The classification field is matched by name because mobile does not persist
 * linked_field_id. That is sufficient rather than lax: the template field is
 * object_type='template' and the global field is 'system', so within the
 * channel-object fields the name is already unambiguous.
 *
 * @param fields channel-object fields in the access_control group, any order
 * @param values every property value on this channel
 * @param nativeBannerText the channel's own banner_info.text, already resolved
 *        server-side. Mobile renders it verbatim and implements no template
 *        renderer; unresolved tokens are stripped by the caller's guard.
 * @param authoredColor the channel's own banner_info.background_color
 */
export function deriveChannelAttributeBanner(
    fields: ChannelAttributeField[],
    values: ChannelAttributeValue[],
    nativeBannerText?: string,
    authoredColor?: string,
    attributesEnabled = false,
): ChannelAttributeBannerState {
    const ordered = [...fields].sort(compareChannelAttributeFields);

    // With channel attributes off, only classification may produce a banner — it
    // ships on its own flag and predates this feature. Any other attribute
    // designating a banner is ignored until the feature it belongs to is enabled,
    // so a configured-but-disabled attribute cannot take over the channel banner.
    const candidates = attributesEnabled ? ordered : ordered.filter((field) => field.name === CLASSIFICATIONS_FIELD_NAME);

    const designated = candidates.find(hasBannerAction);
    const fallback = designated ? undefined : candidates.find(
        (field) => field.name === CLASSIFICATIONS_FIELD_NAME && hasNoDisplayConfiguration(field),
    );

    const bannerField = designated ?? fallback;
    if (!bannerField) {
        return NO_BANNER;
    }

    // Matched by field_id. Taking values[0] was correct only while classification
    // was the single channel attribute; with two, it renders whichever value the
    // query happened to return first.
    const value = values.find((candidate) => candidate.fieldId === bannerField.id);
    const optionId = value?.value;
    if (typeof optionId !== 'string' || !optionId) {
        return NO_BANNER;
    }

    const option = getFieldOptions(bannerField).find((candidate) => candidate.id === optionId);

    // A deleted option renders nothing rather than an unresolvable banner.
    if (!option?.name) {
        return NO_BANNER;
    }

    // Absent banner_info.text reproduces today's output exactly, which is what
    // keeps an existing classification banner byte-identical. The nullish check
    // is deliberate: an empty authored string stays empty rather than falling
    // back to the option name, matching the behaviour being replaced.
    const text = nativeBannerText === undefined || nativeBannerText === null ?
        `**${option.name}**` :
        stripUnresolvedTokens(nativeBannerText);

    // Option color is the canonical visual identity of the level (e.g. red for
    // SECRET). It always wins when present. The channel's authored background_color
    // is a fallback only for text-type attributes that designate a banner but carry
    // no option color.
    const backgroundColor = option.color || authoredColor;

    // An unrenderable banner still reports hasBanner, so it continues to suppress
    // the channel's own banner exactly as the classification path does today. The
    // component's own guard is what decides not to draw it.
    return {
        hasBanner: true,
        banner: {
            enabled: true,
            text,
            background_color: backgroundColor,
        },
    };
}

// Separators the banner composer offers. Excludes '-' and '/': a banner authored
// as "- {{classification}}" is a markdown list, and stripping its marker would
// rewrite what the author wrote.
const SEPARATORS = '·|';

const TOKEN_PATTERN = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g;

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

    const run = new RegExp(`(?:\\s*[${SEPARATORS}]\\s*){2,}`, 'g');
    const leading = new RegExp(`^[\\s${SEPARATORS}]+`);
    const trailing = new RegExp(`[\\s${SEPARATORS}]+$`);

    return stripped.
        replace(run, (match) => ` ${match.trim().charAt(0)} `).
        replace(leading, '').
        replace(trailing, '').
        replace(/\s{2,}/g, ' ');
}

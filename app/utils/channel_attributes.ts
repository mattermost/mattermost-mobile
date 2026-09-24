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
export type ChannelAttributeField = Pick<PropertyFieldModel, 'id' | 'name' | 'type' | 'attrs'>;
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
    // colour when the field is options-bearing. A single-valued attribute has
    // one entry; an unset attribute has none. Chip-rendering surfaces should
    // render one chip per entry instead of collapsing to displayValue, so a
    // multiselect or graph attribute shows each value as its own chip.
    displayValues: Array<{value: string; color?: string}>;

    // Option ids that no longer resolve on an options-bearing field.
    unresolvedOptionIds?: string[];
};

export type ChannelAttributeBannerState = {
    hasBanner: boolean;
    banner: ChannelBannerInfo | undefined;
};

const NO_BANNER: ChannelAttributeBannerState = {hasBanner: false, banner: undefined};

const EMPTY_RESOLVED: ResolvedChannelAttribute[] = [];

// Ranks a field for display. Absent sort_order sorts last rather than first, so
// an unconfigured field never jumps ahead of a configured one.
const NO_SORT_ORDER = Number.MAX_SAFE_INTEGER;

const DEFAULT_BANNER_COLOR = '#DDDDDD';

const OPTION_BACKED_TYPES = new Set<PropertyFieldType>(['select', 'multiselect', 'rank']);

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
    const optionsBearing = OPTION_BACKED_TYPES.has(field.type as PropertyFieldType);

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
 * The attributes listed in Channel Info: every attribute the channel holds a
 * value for, plus every required one still unset.
 *
 * Listed by value, not by display configuration, matching the webapp: the
 * display actions only place attributes in the header and banner, and Channel
 * Info is where a channel's attributes are reviewed, so no display setting may
 * hide one here. A required attribute is listed even when unset, because that
 * empty row is the only thing telling an administrator the channel is
 * incomplete. Optional unset attributes are reachable through Add attribute
 * instead, which is a later story.
 */
export function selectChannelInfoAttributes(attributes: ResolvedChannelAttribute[]): ResolvedChannelAttribute[] {
    const listed = attributes.filter((attribute) => {
        return isPropertyValueSet(attribute.rawValue) || isPropertyFieldRequired(attribute.field);
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
 * so a caller can cap overflow by chip count rather than attribute count. A
 * single multi-valued attribute keeps the bare `{testIDPrefix}.{field.name}`
 * testID when it is the only value on its field, matching what a
 * single-valued attribute has always used; a multi-valued field gets an index
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

/**
 * Groups chip items back by field, in order, so a caller can render one row
 * per field with only the values it was given — e.g. a partially visible
 * multi-valued attribute lists just its remaining values, rather than
 * repeating the ones already shown elsewhere.
 */
export function groupChannelAttributeChipsByField(items: ChannelAttributeChipItem[]): Array<{fieldId: string; label: string; items: ChannelAttributeChipItem[]}> {
    const groups: Array<{fieldId: string; label: string; items: ChannelAttributeChipItem[]}> = [];
    const byFieldId = new Map<string, {fieldId: string; label: string; items: ChannelAttributeChipItem[]}>();
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
 * Resolves one channel banner from every attribute designated for that surface.
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
 * @param nativeBannerText the channel's own banner_info.text template
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

    const designatedFields = candidates.filter(hasBannerAction);
    const designated = designatedFields[0];
    const fallback = designatedFields.length > 0 ? undefined : candidates.find(
        (field) => field.name === CLASSIFICATIONS_FIELD_NAME && hasNoDisplayConfiguration(field),
    );

    const bannerField = designated ?? fallback;
    if (!bannerField) {
        return NO_BANNER;
    }

    const resolvedAttributes = resolveChannelAttributes(ordered, values);

    if (designatedFields.length === 0) {
        const resolved = resolvedAttributes.find((attribute) => attribute.field.id === bannerField.id);
        if (!resolved?.option?.name || resolved.unresolvedOptionIds?.length) {
            return NO_BANNER;
        }

        const text = nativeBannerText ?
            renderBannerTemplate(nativeBannerText, resolvedAttributes) :
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

    const contributions = designatedFields.
        map((field) => resolvedAttributes.find((attribute) => attribute.field.id === field.id)).
        filter((attribute): attribute is ResolvedChannelAttribute => Boolean(
            attribute?.displayValue && !attribute.unresolvedOptionIds?.length,
        ));

    if (contributions.length === 0) {
        return NO_BANNER;
    }

    const text = nativeBannerText ?
        renderBannerTemplate(nativeBannerText, resolvedAttributes) :
        contributions.map((attribute) => attribute.displayValue).join(' · ');
    if (!text) {
        return NO_BANNER;
    }

    const classificationDesignated = designatedFields.some((field) => field.name === CLASSIFICATIONS_FIELD_NAME);
    const classificationContribution = contributions.find((attribute) => attribute.field.name === CLASSIFICATIONS_FIELD_NAME);
    const backgroundColor = classificationDesignated ?
        classificationContribution?.option?.color || DEFAULT_BANNER_COLOR :
        authoredColor || (contributions.length === 1 ? contributions[0].option?.color : undefined) || DEFAULT_BANNER_COLOR;

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

const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

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

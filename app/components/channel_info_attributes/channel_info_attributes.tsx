// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages} from 'react-intl';
import {View} from 'react-native';

import {setChannelAttributeValue, type ChannelAttributeValueInput} from '@actions/remote/channel_attributes';
import ChannelAttributeEditor, {OPTION_ROW_HEIGHT} from '@components/channel_attribute_editor';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidMount from '@hooks/did_mount';
import {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet} from '@screens/navigation';
import {
    canEditAttributeField,
    getAttributeEditability,
    getPropertyFieldChangePolicy,
    isPropertyFieldRequired,
    isPropertyValueSet,
    reachableOptions,
    type AttributeEditability,
    type ChannelAttributePermissions,
    type ResolvedChannelAttribute,
} from '@utils/channel_attributes';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {logDebug} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import AttributeRow from './attribute_row';

// Past this the sheet takes a percentage snap point and scrolls, rather than
// growing to a height that would cover the screen.
const SHEET_MAX_ROWS = 5;

/**
 * Whether to explain why a row is locked.
 *
 * A policy lock is always explained. The value looks editable and is not, and the
 * reason is a property of the channel rather than of the viewer, so it is worth a
 * line whoever is reading.
 *
 * A permission or unsupported-type lock is explained only when some other row on
 * this channel *is* editable, which is the only case where the distinction tells
 * the reader anything. Without that condition an ordinary member would see a
 * permission notice under every row: the System Console pins the tier to `admin`,
 * and ordinary members hold the channel-level permission by default, so the common
 * configuration is precisely the one where every row is denied.
 */
function shouldShowLockReason(editability: AttributeEditability, anyRowEditable: boolean): boolean {
    if (editability.editable) {
        return false;
    }

    switch (editability.reason) {
        case 'never':
        case 'raise_only':
        case 'lower_only':
            return true;
        default:
            return anyRowEditable;
    }
}

const messages = defineMessages({
    heading: {
        id: 'channel_attributes.info.heading',
        defaultMessage: 'Channel Attributes',
    },
});

// Mirrors the Extra block's stacked-heading treatment, which is the existing
// pattern for a non-option section inside Channel Info.
const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginTop: 16,
        marginBottom: 4,
    },
    heading: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        marginBottom: 8,
        ...typography('Body', 75),
    },
}));

type Props = {
    channelId: string;
    attributes: ResolvedChannelAttribute[];
    permissions: ChannelAttributePermissions;
};

type ValidatedSubmission = {
    valid: boolean;
    value: ChannelAttributeValueInput;
};

function validateSubmission(attribute: ResolvedChannelAttribute, value: ChannelAttributeValueInput): ValidatedSubmission {
    const {field, rawValue} = attribute;
    const isClear = !isPropertyValueSet(value);
    if (isClear) {
        const clearable = !isPropertyFieldRequired(field) &&
            (!isPropertyValueSet(rawValue) || getPropertyFieldChangePolicy(field) === 'any');
        return {valid: clearable, value: null};
    }

    if (field.type === 'text') {
        return {valid: typeof value === 'string', value};
    }

    const reachableIds = new Set(reachableOptions(field, rawValue).map((option) => option.id));
    if (field.type === 'multiselect' && Array.isArray(value)) {
        const filtered = value.filter((id) => reachableIds.has(id));
        return {
            valid: !isPropertyFieldRequired(field) || filtered.length > 0,
            value: filtered,
        };
    }

    return {
        valid: typeof value === 'string' && reachableIds.has(value),
        value,
    };
}

/**
 * The CHANNEL ATTRIBUTES block in Channel Info.
 *
 * A required attribute with no value is listed as "Not set" rather than omitted:
 * that empty row is the only thing telling an administrator the channel is
 * incomplete. Optional unset attributes are not listed at all — on the webapp
 * they are reached through Add attribute, which is a later story.
 *
 * This component owns the write and the error surface; the editor sheet owns
 * neither. A failed save is reported beside the row that asked for it, which is
 * still on screen once the sheet has closed, and the row keeps its old value.
 */
const ChannelInfoAttributes = ({channelId, attributes, permissions}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const [failedFieldIds, setFailedFieldIds] = useState<Set<string>>(() => new Set());

    // Two guards against applying a result that no longer belongs to what is on
    // screen. visitToken invalidates every field's in-flight save at once on a
    // channel switch; saveSequence invalidates one field's own stale save without
    // touching any other field's outcome — each save is keyed by fieldId so that
    // submitting field B while field A is still in flight cannot clear or
    // overwrite field A's result.
    const visitToken = useRef(0);
    const saveSequence = useRef<Map<string, number>>(new Map());
    const isMounted = useRef(true);

    // Chained per field so two submits to the same field always reach the server
    // in the order they were made. Without this, the guard above still shows the
    // right outcome on screen, but the two requests race on the network and the
    // one sent first can still be the one the server applies last, leaving the
    // stored value out of sync with the row.
    const pendingWrites = useRef<Map<string, Promise<unknown>>>(new Map());

    useDidMount(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    });

    useEffect(() => {
        visitToken.current += 1;
        saveSequence.current = new Map();
        pendingWrites.current = new Map();
        setFailedFieldIds(new Set());
    }, [channelId]);

    // Rebuilt only when the attribute list changes, so the press handler below
    // keeps a stable reference across renders.
    const byFieldId = useMemo(() => {
        const map = new Map<string, ResolvedChannelAttribute>();
        for (const attribute of attributes) {
            map.set(attribute.field.id, attribute);
        }
        return map;
    }, [attributes]);
    const byFieldIdRef = useRef(byFieldId);
    const permissionsRef = useRef(permissions);
    byFieldIdRef.current = byFieldId;
    permissionsRef.current = permissions;

    // Editability is resolved for the whole section in one pass, because whether a
    // permission lock is worth explaining depends on the other rows.
    const rows = useMemo(() => attributes.map((attribute) => ({
        attribute,
        editability: getAttributeEditability(
            attribute.field,
            attribute.rawValue,
            canEditAttributeField(attribute.field, permissions),
        ),
    })), [attributes, permissions]);

    const anyRowEditable = rows.some(({editability}) => editability.editable);

    const handleSubmit = useCallback(async (fieldId: string, value: ChannelAttributeValueInput) => {
        const token = visitToken.current;
        const sequence = (saveSequence.current.get(fieldId) ?? 0) + 1;
        saveSequence.current.set(fieldId, sequence);

        setFailedFieldIds((current) => {
            if (!current.has(fieldId)) {
                return current;
            }
            const next = new Set(current);
            next.delete(fieldId);
            return next;
        });

        const previousWrite = pendingWrites.current.get(fieldId) ?? Promise.resolve();
        const thisWrite = previousWrite.then(async () => {
            // Read after earlier writes finish. The sheet may have been open while
            // a websocket changed the field, value, or permissions, so captured
            // render data is not authoritative at request time.
            const current = byFieldIdRef.current.get(fieldId);
            if (!current || !getAttributeEditability(
                current.field,
                current.rawValue,
                canEditAttributeField(current.field, permissionsRef.current),
            ).editable) {
                logDebug('handleSubmit', 'skipped stale submit; attribute is no longer editable', channelId, fieldId);
                return {error: 'attribute is no longer editable'};
            }

            const validated = validateSubmission(current, value);
            if (!validated.valid) {
                logDebug('handleSubmit', 'skipped stale submit; value is no longer valid', channelId, fieldId);
                return {error: 'attribute value is no longer valid'};
            }

            return setChannelAttributeValue(serverUrl, channelId, fieldId, validated.value);
        });
        pendingWrites.current.set(fieldId, thisWrite);

        const {error} = await thisWrite;

        // A result from a previous channel, or from a save a later one has already
        // superseded, is not this row's outcome.
        if (!isMounted.current || token !== visitToken.current || saveSequence.current.get(fieldId) !== sequence) {
            return;
        }

        if (error) {
            setFailedFieldIds((prev) => new Set(prev).add(fieldId));
        }
    }, [channelId, serverUrl]);

    const handleRowPress = useCallback((fieldId: string) => {
        const attribute = byFieldId.get(fieldId);
        if (!attribute) {
            logDebug('handleRowPress', 'no resolved attribute for fieldId', fieldId);
            return;
        }

        const {field, rawValue} = attribute;

        // Clearing is offered only where the server would accept it: a directional
        // policy refuses a clear outright, because clearing and re-setting would
        // launder a value straight past it. A required field never accepts a
        // clear regardless of policy — the server always rejects it.
        const clearable = !isPropertyFieldRequired(field) && (getPropertyFieldChangePolicy(field) === 'any' || !isPropertyValueSet(rawValue));

        const renderContent = () => (
            <ChannelAttributeEditor
                attribute={attribute}
                clearable={clearable}
                onSubmit={handleSubmit}
            />
        );

        const sheetRows = field.type === 'text' ? 1 : reachableOptions(field, rawValue).length + (clearable ? 1 : 0);
        const height = bottomSheetSnapPoint(Math.min(sheetRows, SHEET_MAX_ROWS), OPTION_ROW_HEIGHT) + (2 * TITLE_HEIGHT);
        const snapPoints: Array<string | number> = [1, height];
        if (sheetRows > SHEET_MAX_ROWS) {
            snapPoints.push('80%');
        }

        bottomSheet(renderContent, snapPoints);
    }, [byFieldId, handleSubmit]);

    // Returning null here rather than having the parent gate on it: the list is
    // only known by subscribing to it, and Channel Info doing that itself would
    // mean a second subscription to the same query.
    if (attributes.length === 0) {
        return null;
    }

    return (
        <View
            style={styles.container}
            testID='channel_info.attributes'
        >
            <FormattedText
                {...messages.heading}
                style={styles.heading}
            />

            {rows.map(({attribute, editability}) => (
                <AttributeRow
                    key={attribute.field.id}
                    attribute={attribute}
                    editability={editability}
                    showLockReason={shouldShowLockReason(editability, anyRowEditable)}
                    failed={failedFieldIds.has(attribute.field.id)}
                    onPress={handleRowPress}
                />
            ))}
        </View>
    );
};

export default ChannelInfoAttributes;

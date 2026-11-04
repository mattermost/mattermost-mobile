// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {defineMessages} from 'react-intl';
import {useWindowDimensions, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {setChannelAttributeValue, type ChannelAttributeValueInput} from '@actions/remote/channel_attributes';
import ChannelAttributeEditor from '@components/channel_attribute_editor';
import {getChannelAttributeEditorSnapPoints} from '@components/channel_attribute_editor/utils';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import useDidMount from '@hooks/did_mount';
import {bottomSheet} from '@screens/navigation';
import {
    canEditAttributeField,
    getAttributeEditability,
    getEmptyPropertyValue,
    getPropertyFieldChangePolicy,
    isPropertyFieldRequired,
    isPropertyValueSet,
    reachableOptions,
    type AttributeEditability,
    type ChannelAttributePermissions,
    type ResolvedChannelAttribute,
} from '@utils/channel_attributes';
import {logDebug} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import AttributeRow from './attribute_row';

/**
 * Policy locks are always explained. Other locks only when some row is editable: by default
 * every row is denied to ordinary members, who would otherwise see a notice under each one.
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
    value: string | string[];
};

function validateSubmission(attribute: ResolvedChannelAttribute, value: ChannelAttributeValueInput): ValidatedSubmission {
    const {field, rawValue} = attribute;
    const isClear = !isPropertyValueSet(value);
    if (isClear) {
        const clearable = !isPropertyFieldRequired(field) &&
            (!isPropertyValueSet(rawValue) || getPropertyFieldChangePolicy(field) === 'any');
        return {valid: clearable, value: getEmptyPropertyValue(field.type)};
    }

    if (field.type === 'text') {
        return {valid: typeof value === 'string', value: value ?? ''};
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
        value: value ?? '',
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
 * Failed saves are reported here, beside the row; the editor sheet has no error surface.
 */
const ChannelInfoAttributes = ({channelId, attributes, permissions}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const {bottom} = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const {height: windowHeight} = useWindowDimensions();

    const [failedFieldIds, setFailedFieldIds] = useState<Set<string>>(() => new Set());

    // visitToken drops every in-flight result on a channel switch; saveSequence drops a field's
    // superseded result without touching other fields.
    const visitToken = useRef(0);
    const saveSequence = useRef<Map<string, number>>(new Map());
    const isMounted = useRef(true);

    // Chained per field so the server applies writes in submit order.
    const pendingWrites = useRef<Map<string, Promise<unknown>>>(new Map());

    useDidMount(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    });

    // Layout effect so the token moves in the same commit as the refs below; queued saves check it.
    useLayoutEffect(() => {
        visitToken.current += 1;
        saveSequence.current = new Map();
        pendingWrites.current = new Map();
        setFailedFieldIds(new Set());
    }, [channelId]);

    const byFieldId = useMemo(() => {
        const map = new Map<string, ResolvedChannelAttribute>();
        for (const attribute of attributes) {
            map.set(attribute.field.id, attribute);
        }
        return map;
    }, [attributes]);
    const byFieldIdRef = useRef(byFieldId);
    const permissionsRef = useRef(permissions);

    useLayoutEffect(() => {
        byFieldIdRef.current = byFieldId;
        permissionsRef.current = permissions;
    }, [byFieldId, permissions]);

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
            // A channel switch doesn't cancel a queued chain; don't write the new channel's data to the old one.
            if (token !== visitToken.current) {
                logDebug('handleSubmit', 'skipped stale submit; channel changed', channelId, fieldId);
                return {error: 'channel changed'};
            }

            // Re-read at request time: a websocket may have changed the field, value or permissions.
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

        // The server refuses a clear on a required field, or under a directional policy once set.
        const clearable = !isPropertyFieldRequired(field) && (getPropertyFieldChangePolicy(field) === 'any' || !isPropertyValueSet(rawValue));

        const renderContent = () => (
            <ChannelAttributeEditor
                attribute={attribute}
                clearable={clearable}
                onSubmit={handleSubmit}
            />
        );

        const totalRows = field.type === 'text' ? 1 : reachableOptions(field, rawValue).length + (clearable ? 1 : 0);
        const snapPoints = getChannelAttributeEditorSnapPoints({totalRows, fieldType: field.type, bottomInset: bottom, isTablet, windowHeight});

        bottomSheet(renderContent, snapPoints, undefined, 'interactive');
    }, [bottom, byFieldId, handleSubmit, isTablet, windowHeight]);

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

// Memoized because Channel Info holds many unrelated subscriptions, and
// withObservables re-renders on every parent render in steady state.
export default React.memo(ChannelInfoAttributes);

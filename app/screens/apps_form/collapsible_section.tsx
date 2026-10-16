// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, type PressableStateCallbackType, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    label: string;
    expanded: boolean;
    bordered?: boolean;

    // Nesting level (0 = top level); each level adds a small left indent.
    depth?: number;
    children: React.ReactNode;
    testID?: string;
};

const INDENT_PER_LEVEL = 12;

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        section: {
            marginHorizontal: 15,
            marginTop: 10,
        },
        bordered: {
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderRadius: 4,
        },
        header: {
            alignItems: 'center',
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 10,
            paddingVertical: 10,
        },
        headerPressed: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        },
        chevron: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
        title: {
            color: theme.centerChannelColor,
            flex: 1,
            ...typography('Heading', 75),
        },

        // Fields carry their own horizontal margins, so the content only needs
        // the bottom gap that separates the last field from the border.
        content: {
            paddingBottom: 10,
        },
    };
});

/**
 * Title plus chevron toggle for a group of dialog fields. Children unmount
 * while collapsed; their values live in the form's reducer, so nothing typed
 * is lost by closing a section.
 */
const CollapsibleSection = ({label, expanded, bordered = true, depth = 0, children, testID}: Props) => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const [open, setOpen] = useState(expanded);

    // Re-sync when a refresh hands back a section with a different default;
    // useState only seeds on mount and this instance survives form switches.
    useEffect(() => {
        setOpen(expanded);
    }, [expanded]);

    const toggle = usePreventDoubleTap(useCallback(() => {
        setOpen((prev) => !prev);
    }, []));

    const sectionStyle = useMemo(() => [
        style.section,
        bordered && style.bordered,
        depth > 0 && {marginLeft: depth * INDENT_PER_LEVEL},
    ], [bordered, depth, style.bordered, style.section]);

    const headerStyle = useCallback(({pressed}: PressableStateCallbackType) => [
        style.header,
        pressed && style.headerPressed,
    ], [style.header, style.headerPressed]);

    const accessibilityState = useMemo(() => ({expanded: open}), [open]);

    return (
        <View
            style={sectionStyle}
            testID={testID}
        >
            <Pressable
                onPress={toggle}
                style={headerStyle}
                accessibilityRole='button'
                accessibilityState={accessibilityState}
                accessibilityLabel={label}
                testID={testID ? `${testID}.toggle` : undefined}
            >
                <CompassIcon
                    name={open ? 'chevron-down' : 'chevron-right'}
                    size={18}
                    style={style.chevron}
                />
                <Text style={style.title}>{label}</Text>
            </Pressable>
            {open && (
                <View
                    style={style.content}
                    testID={testID ? `${testID}.content` : undefined}
                >
                    {children}
                </View>
            )}
        </View>
    );
};

export default CollapsibleSection;

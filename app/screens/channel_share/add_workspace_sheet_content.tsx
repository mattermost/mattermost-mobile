// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView, Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {useBottomSheetListsFix} from '@hooks/bottom_sheet_lists_fix';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {messages} from './messages';
import WorkspaceOptionRow, {OPTION_ROW_HEIGHT} from './workspace_option_row';

// Height constants aligned with getStyleSheet (header + option row) for snap point calculation
const BOTTOM_FIX = 32; // Magic number: Without this, the bottom of the sheet is cut off
const HEADER_MARGIN_TOP = 0;
const TITLE_LINE_HEIGHT = 30; // typography Heading 600
const HEADER_GAP = 8;
const SUBTITLE_LINE_HEIGHT = 16; // typography Body 75
const HEADER_MARGIN_BOTTOM = 12;

const HEADER_HEIGHT = HEADER_MARGIN_TOP + TITLE_LINE_HEIGHT + HEADER_GAP + SUBTITLE_LINE_HEIGHT + HEADER_MARGIN_BOTTOM;

const MAX_OPTIONS_BEFORE_SCROLL = 4.5; // 4 options and a half, to show that it is scrollable

const EMPTY_MESSAGE_LINE_HEIGHT = 24; // typography Body 200
const EMPTY_MESSAGE_HEIGHT = 2 * EMPTY_MESSAGE_LINE_HEIGHT;

/**
 * Returns the height of AddWorkspaceSheetContent for the given layout.
 */
export function getAddWorkspaceSheetContentHeight(isTablet: boolean, elementCount: number): number {
    const listHeight = elementCount === 0 ? EMPTY_MESSAGE_HEIGHT : (Math.min(elementCount, MAX_OPTIONS_BEFORE_SCROLL) * OPTION_ROW_HEIGHT);
    return (isTablet ? 0 : HEADER_HEIGHT) + BOTTOM_FIX + listHeight;
}

type Props = {
    available: RemoteClusterInfo[];
    onSelect: (remote: RemoteClusterInfo) => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
    },
    header: {
        marginTop: HEADER_MARGIN_TOP,
        marginBottom: HEADER_MARGIN_BOTTOM,
        gap: HEADER_GAP,
    },
    scrollContainer: {
        flex: 1,
    },
    titleText: {
        ...typography('Heading', 600, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    subtitleText: {
        ...typography('Body', 75, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.75),
    },
    emptyMessage: {
        ...typography('Body', 200, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.75),
    },
}));

const AddWorkspaceSheetContent = ({available, onSelect}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const {enabled, panResponder} = useBottomSheetListsFix();
    const styles = getStyleSheet(theme);

    const Scroll = useMemo(() => (isTablet ? ScrollView : BottomSheetScrollView), [isTablet]);

    return (
        <View style={styles.container}>
            {!isTablet && (
                <View style={styles.header}>
                    <Text style={styles.titleText}>
                        {intl.formatMessage(messages.addWorkspaceSheetTitle)}
                    </Text>
                    <Text style={styles.subtitleText}>
                        {intl.formatMessage(messages.addWorkspaceSheetSubtitle)}
                    </Text>
                </View>
            )}
            {available.length === 0 ? (
                <Text
                    style={styles.emptyMessage}
                    testID='channel_share.add_workspace_sheet.empty'
                >
                    {intl.formatMessage(messages.addWorkspaceSheetAllConnected)}
                </Text>
            ) : (
                <Scroll
                    style={styles.scrollContainer}
                    scrollEnabled={enabled}
                    showsVerticalScrollIndicator={false}
                    {...panResponder.panHandlers}
                >
                    {available.map((r) => (
                        <WorkspaceOptionRow
                            key={r.remote_id}
                            remote={r}
                            onSelect={onSelect}
                        />
                    ))}
                </Scroll>
            )}
        </View>
    );
};

export default AddWorkspaceSheetContent;

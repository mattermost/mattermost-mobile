// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useMemo} from 'react';
import {View} from 'react-native';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import ChannelBookmarks from '@components/channel_bookmarks';
import {CHANNEL_SHEET_RADIUS} from '@constants/platform_ui';
import {useTheme} from '@context/theme';
import {useDefaultHeaderHeight} from '@hooks/header';
import {observeCanAddBookmarks, queryBookmarks} from '@queries/servers/channel_bookmark';
import {observeChannelBookmarksEnabled} from '@queries/servers/features';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = {
    canAddBookmarks: boolean;
    channelId: string;
    hasBookmarks: boolean;
    isBookmarksEnabled: boolean;

    /** When true, sits in the channel sheet (no absolute offset / own top radius). */
    embedded?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    content: {
        backgroundColor: theme.centerChannelBg,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    embedded: {
        backgroundColor: theme.centerChannelBg,
        borderTopLeftRadius: CHANNEL_SHEET_RADIUS,
        borderTopRightRadius: CHANNEL_SHEET_RADIUS,
    },
    separator: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    separatorContainer: {
        backgroundColor: theme.centerChannelBg,
        zIndex: 1,
    },
    paddingHorizontal: {
        paddingLeft: 10,
    },
}));

const ChannelHeaderBookmarks = ({
    canAddBookmarks,
    channelId,
    hasBookmarks,
    isBookmarksEnabled,
    embedded = false,
}: Props) => {
    const theme = useTheme();
    const defaultHeight = useDefaultHeaderHeight();
    const styles = getStyleSheet(theme);

    const containerStyle = useMemo(() => {
        if (embedded) {
            return styles.embedded;
        }

        return {
            ...styles.content,
            left: 0,
            position: 'absolute' as const,
            right: 0,
            top: defaultHeight,
            zIndex: 1,
        };
    }, [defaultHeight, embedded, styles.content, styles.embedded]);

    if (!isBookmarksEnabled || !hasBookmarks) {
        return null;
    }

    return (
        <View style={containerStyle}>
            <View style={embedded ? styles.embedded : styles.content}>
                <View style={styles.paddingHorizontal}>
                    <ChannelBookmarks
                        channelId={channelId}
                        showInInfo={false}
                        canAddBookmarks={canAddBookmarks}
                        separator={false}
                    />
                </View>
            </View>
            <View style={styles.separatorContainer}>
                <View style={styles.separator}/>
            </View>
        </View>
    );
};

const enhanced = withObservables(['channelId'], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => ({
    canAddBookmarks: observeCanAddBookmarks(database, channelId),
    hasBookmarks: queryBookmarks(database, channelId).observeCount(false).pipe(
        switchMap((count) => of$(count > 0)),
        distinctUntilChanged(),
    ),
    isBookmarksEnabled: observeChannelBookmarksEnabled(database),
}));

export default withDatabase(enhanced(ChannelHeaderBookmarks));

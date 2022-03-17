// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback, useMemo} from 'react';
import {Platform, StyleSheet, TouchableOpacity, View} from 'react-native';

import {updateThreadFollow} from '@actions/remote/thread';
import FormattedText from '@components/formatted_text';
import {MM_TABLES} from '@constants/database';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';

const {SERVER: {THREAD}} = MM_TABLES;

type Props = {
    teamId: string;
    thread: ThreadModel;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            borderColor: theme.sidebarHeaderTextColor,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            paddingVertical: 4.5,
            paddingHorizontal: 10,
            opacity: 0.72,
            ...Platform.select({
                android: {
                    marginRight: 12,
                },
                ios: {
                    right: -4,
                },
            }),
        },
        containerActive: {
            backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.24),
            borderColor: 'transparent',
            opacity: 1,
        },
        text: {
            color: theme.sidebarHeaderTextColor,
            fontWeight: '600',
            fontSize: 12,
        },
    };
});

function ThreadFollow({teamId, thread}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const serverUrl = useServerUrl();

    const onPress = useCallback(preventDoubleTap(() => {
        updateThreadFollow(serverUrl, teamId, thread.id, !thread.isFollowing);
    }), [teamId, thread.isFollowing]);

    const [containerStyle, followTextProps] = useMemo(() => {
        const container = [styles.container];
        let followText = {
            id: 'threads.follow',
            defaultMessage: 'Follow',
        };
        if (thread.isFollowing) {
            container.push(styles.containerActive);
            followText = {
                id: 'threads.following',
                defaultMessage: 'Following',
            };
        }
        return [container, followText];
    }, [thread.isFollowing]);

    return (
        <TouchableOpacity onPress={onPress}>
            <View style={containerStyle}>
                <FormattedText
                    {...followTextProps}
                    style={styles.text}
                />
            </View>
        </TouchableOpacity>
    );
}

const enhanced = withObservables(['threadId'], ({threadId, database}: {threadId: string} & WithDatabaseArgs) => {
    const thread = database.get<ThreadModel>(THREAD).findAndObserve(threadId);
    return {
        thread,
    };
});

export default withDatabase(enhanced(ThreadFollow));

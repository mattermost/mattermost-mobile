// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {getConnectionStatus, type ConnectionStatus} from '@utils/remote_cluster_connection';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {messages} from './messages';

export type SharedChannelWorkspace = RemoteClusterInfo & {
    status: 'pending' | 'saving' | 'saved';
};

function getStatusLabelKey(status: ConnectionStatus): keyof typeof messages {
    switch (status) {
        case 'pending_save':
            return 'pendingSave';
        case 'connection_pending':
            return 'connectionPending';
        case 'offline':
            return 'offline';
        default:
            return 'online';
    }
}

type Props = {
    item: SharedChannelWorkspace;
    onRemove: (item: SharedChannelWorkspace) => void;
    isFirst: boolean;
    removeDisabled?: boolean;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        paddingVertical: 12,
        gap: 8,
    },
    name: {
        ...typography('Body', 200, 'Regular'),
        color: theme.centerChannelColor,
    },
    status: {
        ...typography('Body', 100, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    nameContainer: {flexShrink: 1},
    statusCell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
}));

const WorkspaceItem = ({item, onRemove, isFirst, removeDisabled = false}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const connectionStatus = getConnectionStatus({
        site_url: item.site_url,
        last_ping_at: item.last_ping_at,
        pendingSave: item.status === 'pending',
    });
    let statusLabel: string;
    if (item.status === 'saving') {
        statusLabel = intl.formatMessage(messages.saving);
    } else if (connectionStatus === 'pending_save') {
        statusLabel = intl.formatMessage(messages.pendingSave);
    } else {
        statusLabel = intl.formatMessage(messages[getStatusLabelKey(connectionStatus)]);
    }

    const handleRemove = usePreventDoubleTap(useCallback(() => {
        onRemove(item);
    }, [item, onRemove]));

    const statusStyle = useMemo(() => {
        let color = theme.errorTextColor;
        if (connectionStatus === 'connected') {
            color = theme.onlineIndicator;
        } else if (connectionStatus === 'connection_pending') {
            color = changeOpacity(theme.centerChannelColor, 0.75);
        }
        return [styles.status, {color}];
    }, [connectionStatus, theme, styles.status]);

    let icon;
    if (connectionStatus === 'connected') {
        icon = (
            <CompassIcon
                name='check-circle'
            />
        );
    }

    const rowStyle = useMemo(() => {
        return [styles.row, {borderTopWidth: isFirst ? 1 : 0}];
    }, [isFirst, styles.row]);

    return (
        <View style={rowStyle}>
            <View style={styles.nameContainer}>
                <Text
                    style={styles.name}
                    numberOfLines={1}
                >
                    {item.display_name || item.name}
                </Text>
            </View>
            <Text style={statusStyle}>{icon}{icon ? ' ' : ''}{statusLabel}</Text>
            <TouchableOpacity
                onPress={handleRemove}
                disabled={removeDisabled}
                accessibilityRole='button'
                accessibilityLabel={intl.formatMessage(messages.removeWorkspaceLabel, {
                    workspaceName: item.display_name || item.name || item.remote_id,
                })}
                testID={`channel_share.remove.${item.remote_id}`}
            >
                <CompassIcon
                    name='trash-can-outline'
                    size={24}
                    color={theme.dndIndicator}
                />
            </TouchableOpacity>
        </View>
    );
};

export default WorkspaceItem;

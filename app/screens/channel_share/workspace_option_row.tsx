// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, TouchableOpacity} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const OPTION_PADDING_VERTICAL = 14;
const OPTION_LINE_HEIGHT = 24; // typography Body 200

export const OPTION_ROW_HEIGHT = (OPTION_PADDING_VERTICAL * 2) + OPTION_LINE_HEIGHT;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    option: {
        paddingVertical: OPTION_PADDING_VERTICAL,
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionText: {
        ...typography('Body', 200, 'Regular'),
        color: theme.centerChannelColor,
    },
}));

type WorkspaceOptionRowProps = {
    remote: RemoteClusterInfo;
    onSelect: (remote: RemoteClusterInfo) => void;
};

const WorkspaceOptionRow = ({remote, onSelect}: WorkspaceOptionRowProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(() => {
        onSelect(remote);
    }, [remote, onSelect]);

    return (
        <TouchableOpacity
            style={styles.option}
            onPress={handlePress}
            testID={`channel_share.workspace_option.${remote.remote_id}`}
        >
            <Text
                style={styles.optionText}
                numberOfLines={1}
            >
                {remote.display_name || remote.name}
            </Text>
        </TouchableOpacity>
    );
};

export default WorkspaceOptionRow;

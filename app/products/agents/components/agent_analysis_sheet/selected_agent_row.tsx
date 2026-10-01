// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Pressable, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {SelectableAgent} from '@agents/types';

type Props = {
    agent: SelectableAgent | null;
    disabled: boolean;
    onPress: () => void;
    testID: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    label: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'Regular'),
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    agentName: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        ...typography('Body', 100, 'Regular'),
    },
}));

const SelectedAgentRow = ({agent, disabled, onPress, testID}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <Pressable
            onPress={onPress}
            style={({pressed}) => [styles.row, pressed && {opacity: 0.72}]}
            testID={testID}
            disabled={disabled}
        >
            <FormattedText
                id='agents.channel_summary.selected_agent'
                defaultMessage='Selected Agent'
                style={styles.label}
            />
            <View style={styles.selector}>
                <Text style={styles.agentName}>{agent?.displayName || agent?.username || ''}</Text>
                <CompassIcon
                    name='chevron-right'
                    size={20}
                    color={changeOpacity(theme.centerChannelColor, 0.32)}
                />
            </View>
        </Pressable>
    );
};

export default SelectedAgentRow;

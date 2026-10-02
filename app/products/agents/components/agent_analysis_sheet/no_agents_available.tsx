// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        paddingHorizontal: 16,
        gap: 12,
    },
    text: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        textAlign: 'center',
        ...typography('Body', 200, 'Regular'),
    },
}));

const NoAgentsAvailable = ({testID}: {testID: string}) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <BottomSheetScrollView>
            <View style={styles.container}>
                <CompassIcon
                    name='creation-outline'
                    size={48}
                    color={changeOpacity(theme.centerChannelColor, 0.48)}
                />
                <FormattedText
                    id='agents.channel_summary.no_agents'
                    defaultMessage='No agents are available for this channel.'
                    style={styles.text}
                    testID={testID}
                />
            </View>
        </BottomSheetScrollView>
    );
};

export default NoAgentsAvailable;

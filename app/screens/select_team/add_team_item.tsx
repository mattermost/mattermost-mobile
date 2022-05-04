// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {goToScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            height: 64,
            marginBottom: 2,
        },
        touchable: {
            display: 'flex',
            flexDirection: 'row',
            borderRadius: 4,
            alignItems: 'center',
            height: '100%',
            width: '100%',
        },
        text: {
            color: theme.sidebarText,
            marginLeft: 16,
            ...typography('Body', 200),
        },
        icon_container_container: {
            width: 40,
            height: 40,
        },
        icon_container: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.sidebarText, 0.16),
            borderRadius: 10,
        },
        icon: {
            color: theme.sidebarText,
            fontSize: 24,
        },
    };
});

export default function AddTeamItem() {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const onPress = useCallback(async () => {
        // TODO https://mattermost.atlassian.net/browse/MM-43622
        goToScreen(Screens.CREATE_TEAM, 'Create team');
    }, []);

    return (
        <View style={styles.container}>
            <TouchableWithFeedback
                onPress={onPress}
                type='opacity'
                style={styles.touchable}
            >
                <View style={styles.icon_container_container}>
                    <View style={styles.icon_container}>
                        <CompassIcon
                            name='plus'
                            style={styles.icon}
                        />
                    </View>
                </View>
                <Text
                    style={styles.text}
                    numberOfLines={1}
                >{intl.formatMessage({id: 'mobile.add_team.create_team', defaultMessage: 'Create a new team'})}</Text>
            </TouchableWithFeedback>
        </View>
    );
}

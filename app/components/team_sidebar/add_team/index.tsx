// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {showModal} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 0,
            backgroundColor: changeOpacity(theme.sidebarText, 0.08),
            borderRadius: 10,
            height: 48,
            width: 48,
            marginTop: 6,
            marginBottom: 12,
            marginHorizontal: 12,
            overflow: 'hidden',
        },
        touchable: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});

export default function AddTeam() {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const onPress = useCallback(preventDoubleTap(() => {
        const title = intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'});
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const closeButtonId = 'close-join-team';
        const options = {
            topBar: {
                leftButtons: [{
                    id: closeButtonId,
                    icon: closeButton,
                    testID: 'close.join_team.button',
                }],
            },
        };
        showModal(Screens.JOIN_TEAM, title, {closeButtonId}, options);
    }), [intl]);

    return (
        <View style={styles.container}>
            <TouchableWithFeedback
                onPress={onPress}
                type='opacity'
                style={styles.touchable}
                testID='team_sidebar.add_team.button'
            >
                <CompassIcon
                    size={28}
                    name='plus'
                    color={changeOpacity(theme.sidebarText, 0.64)}
                />
            </TouchableWithFeedback>
        </View>
    );
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {useWindowDimensions, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheet} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AddTeamSlideUp from './add_team_slide_up';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    otherTeams: TeamModel[];
}

const ITEM_HEIGHT = 72;
const HEADER_HEIGHT = 66;
const CONTAINER_HEIGHT = 392;

//const CREATE_HEIGHT = 97;

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

export default function AddTeam({otherTeams}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const dimensions = useWindowDimensions();
    const intl = useIntl();
    const isTablet = useIsTablet();
    const maxHeight = Math.round((dimensions.height * 0.9));

    const onPress = useCallback(preventDoubleTap(() => {
        const renderContent = () => {
            return (
                <AddTeamSlideUp
                    otherTeams={otherTeams}
                    showTitle={!isTablet && Boolean(otherTeams.length)}
                />
            );
        };

        let height = CONTAINER_HEIGHT;
        if (otherTeams.length) {
            height = Math.min(maxHeight, HEADER_HEIGHT + ((otherTeams.length + 1) * ITEM_HEIGHT));
        }

        bottomSheet({
            closeButtonId: 'close-join-team',
            renderContent,
            snapPoints: [height, 10],
            theme,
            title: intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'}),
        });
    }), [otherTeams, isTablet, theme]);

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

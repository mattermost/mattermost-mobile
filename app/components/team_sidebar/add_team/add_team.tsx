// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';
import {useWindowDimensions, View} from 'react-native';

import TouchableWithFeedback from '@app/components/touchable_with_feedback';
import {showModalOverCurrentContext} from '@app/screens/navigation';
import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import TeamModel from '@typings/database/models/servers/team';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AddTeamSlideUp from './add_team_slide_up';

const ITEM_HEIGHT = 72;
const CREATE_HEIGHT = 97;
const HEADER_HEIGHT = 66;

type Props = {
    canCreateTeams: boolean;
    otherTeams: TeamModel[];
}
export default function AddTeam({canCreateTeams, otherTeams}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const dimensions = useWindowDimensions();
    const maxHeight = Math.round((dimensions.height * 0.9));

    const onPress = useCallback(() => {
        const renderContent = () => {
            return (
                <AddTeamSlideUp
                    otherTeams={otherTeams}
                    canCreateTeams={canCreateTeams}
                />
            );
        };

        const height = Math.min(maxHeight, HEADER_HEIGHT + (otherTeams.length * ITEM_HEIGHT) + (canCreateTeams ? CREATE_HEIGHT : 0));

        showModalOverCurrentContext('BottomSheet', {
            renderContent,
            snapPoints: [height, 10],
        });
    }, [canCreateTeams, otherTeams]);

    return (
        <View style={styles.container}>
            <TouchableWithFeedback
                onPress={onPress}
                type='opacity'
                style={styles.touchable}
            >
                <CompassIcon
                    size={28}
                    name='plus'
                    color={changeOpacity(theme.buttonColor, 0.64)}
                />
            </TouchableWithFeedback>
        </View>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 0,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.64),
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

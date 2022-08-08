// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {useWindowDimensions, ScaledSize, View} from 'react-native';
import {useSafeAreaInsets, EdgeInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import {ITEM_HEIGHT} from '@components/team_sidebar/add_team/team_list_item/team_list_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {PADDING_TOP_MOBILE} from '@screens/bottom_sheet';
import {TITLE_HEIGHT, TITLE_SEPARATOR_MARGIN} from '@screens/bottom_sheet/content';
import {bottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AddTeamSlideUp from './add_team_slide_up';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    otherTeams: TeamModel[];
}

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

type TeamsSnapProps = {
    teams: TeamModel[];
    dimensions: ScaledSize;
    insets: EdgeInsets;
}

const NO_TEAMS_HEIGHT = 392;
export const getTeamsSnapHeight = ({dimensions, teams, insets}: TeamsSnapProps) => {
    let height = NO_TEAMS_HEIGHT;
    if (teams.length) {
        const itemsHeight = bottomSheetSnapPoint(teams.length, ITEM_HEIGHT, 0);
        const heightWithHeader = PADDING_TOP_MOBILE +
            TITLE_HEIGHT +
            (TITLE_SEPARATOR_MARGIN * 2) +
            itemsHeight +
            insets.bottom;
        const maxHeight = Math.round((dimensions.height * 0.9));
        height = Math.min(maxHeight, heightWithHeader);
    }
    return height;
};

export default function AddTeam({otherTeams}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const dimensions = useWindowDimensions();
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();

    const onPress = useCallback(preventDoubleTap(() => {
        const title = intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'});
        const renderContent = () => {
            return (
                <AddTeamSlideUp
                    otherTeams={otherTeams}
                    showTitle={!isTablet && Boolean(otherTeams.length)}
                    title={title}
                />
            );
        };

        const height = getTeamsSnapHeight({dimensions, teams: otherTeams, insets});
        bottomSheet({
            closeButtonId: 'close-team_list',
            renderContent,
            snapPoints: [height, 10],
            theme,
            title,
        });
    }), [otherTeams, intl, isTablet, dimensions, theme]);

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

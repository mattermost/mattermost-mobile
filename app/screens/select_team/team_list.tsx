// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import TeamFlatList from '@components/team_list';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
        marginHorizontal: 24,
    },
    title: {
        color: theme.sidebarHeaderTextColor,
        marginTop: 40,
        ...typography('Heading', 800),
    },
    description: {
        color: changeOpacity(theme.sidebarText, 0.72),
        marginTop: 12,
        marginBottom: 25,
        ...typography('Body', 200, 'Regular'),
    },
    separator: {
        borderColor: changeOpacity(theme.sidebarText, 0.08),
        borderTopWidth: 1,
        marginVertical: 8,
    },
}));

type Props = {
    teams: Team[];
    onEndReached: () => void;
    onPress: (id: string) => void;
    loading: boolean;
};
function TeamList({
    teams,
    onEndReached,
    onPress,
    loading,
}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const isTablet = useIsTablet();

    const containerStyle = useMemo(() => {
        return isTablet ? [styles.container, {maxWidth: 600, alignItems: 'center' as const}] : styles.container;
    }, [isTablet, styles]);

    return (
        <View style={containerStyle}>
            <View>
                <Text style={styles.title}>{intl.formatMessage({id: 'select_team.title', defaultMessage: 'Select a team'})}</Text>
                <Text style={styles.description}>{intl.formatMessage({id: 'select_team.description', defaultMessage: 'You are not yet a member of any teams. Select one below to get started.'})}</Text>
            </View>
            {/* {canCreateTeam && ( // TODO https://mattermost.atlassian.net/browse/MM-43622
                <>
                    <AddTeamItem/>
                    <View style={styles.separator}/>
                </>
            )} */}
            <TeamFlatList
                teams={teams}
                textColor={theme.sidebarText}
                iconBackgroundColor={changeOpacity(theme.sidebarText, 0.16)}
                iconTextColor={theme.sidebarText}
                onPress={onPress}
                onEndReached={onEndReached}
                loading={loading}
            />
        </View>
    );
}

export default TeamList;

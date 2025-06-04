// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import Empty from '@components/illustrations/no_team';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 24,
        maxWidth: 600,
        alignSelf: 'center',
    },
    iconWrapper: {
        height: 120,
        width: 120,
        backgroundColor: changeOpacity(theme.sidebarText, 0.08),
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: theme.sidebarHeaderTextColor,
        marginTop: 24,
        textAlign: 'center',
        ...typography('Heading', 800),
    },
    description: {
        color: changeOpacity(theme.sidebarText, 0.72),
        textAlign: 'center',
        marginTop: 12,
        ...typography('Body', 200, 'Regular'),
    },
}));

const NoTeams = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    return (
        <View style={styles.container}>
            <View style={styles.iconWrapper}>
                <Empty theme={theme}/>
            </View>
            <Text style={styles.title}>
                {intl.formatMessage({id: 'select_team.no_team.title', defaultMessage: 'No teams are available to join'})}
            </Text>
            <Text style={styles.description}>
                {intl.formatMessage({id: 'select_team.no_team.description', defaultMessage: 'To join a team, ask a team admin for an invite, or create your own team. You may also want to check your email inbox for an invitation.'})}
            </Text>
            {/* {canCreateTeams && // TODO https://mattermost.atlassian.net/browse/MM-43622 (Use Button component instead of touchable)
                <TouchableWithFeedback
                    style={styles.buttonStyle}
                    type={'opacity'}
                    onPress={onButtonPress}
                >
                    <CompassIcon
                        name='plus'
                        style={styles.plusIcon}
                    />
                    <Text style={styles.buttonText}>{intl.formatMessage({id: 'mobile.add_team.create_team', defaultMessage: 'Create a new team'})}</Text>
                </TouchableWithFeedback>
            } */}
        </View>
    );
};

export default NoTeams;

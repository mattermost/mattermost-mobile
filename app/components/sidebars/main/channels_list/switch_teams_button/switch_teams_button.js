// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    TouchableHighlight,
    View,
} from 'react-native';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';

import Badge from 'app/components/badge';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import TeamIcon from 'app/components/team_icon';

export default class SwitchTeamsButton extends React.PureComponent {
    static propTypes = {
        currentTeamId: PropTypes.string,
        onShowTeams: PropTypes.func.isRequired,
        mentionCount: PropTypes.number.isRequired,
        teamsCount: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired,
    };

    showTeams = preventDoubleTap(() => {
        this.props.onShowTeams();
    });

    render() {
        const {
            currentTeamId,
            mentionCount,
            teamsCount,
            theme,
        } = this.props;

        if (!currentTeamId) {
            return null;
        }

        if (teamsCount < 2) {
            return null;
        }

        const styles = getStyleSheet(theme);

        const badge = (
            <Badge
                containerStyle={styles.badgeContainer}
                style={styles.badge}
                countStyle={styles.mention}
                minWidth={20}
                count={mentionCount}
            />
        );

        return (
            <View>
                <TouchableHighlight
                    onPress={this.showTeams}
                    underlayColor={changeOpacity(theme.sidebarHeaderBg, 0.5)}
                >
                    <View style={styles.switcherContainer}>
                        <AwesomeIcon
                            name='chevron-left'
                            size={12}
                            style={styles.switcherArrow}
                        />
                        <TeamIcon
                            teamId={currentTeamId}
                            styleContainer={styles.teamIconContainer}
                            styleText={styles.teamIconText}
                            styleImage={styles.teamIcon}
                        />
                    </View>
                </TouchableHighlight>
                {badge}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        badge: {
            backgroundColor: theme.mentionBg,
            height: 20,
            padding: 3,
        },
        badgeContainer: {
            borderColor: theme.sidebarBg,
            borderRadius: 14,
            borderWidth: 2,
            position: 'absolute',
            right: 0,
            top: -9,
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10,
        },
        switcherArrow: {
            color: theme.sidebarHeaderBg,
            marginRight: 8,
            top: 1,
        },
        switcherContainer: {
            alignItems: 'center',
            backgroundColor: theme.sidebarHeaderTextColor,
            borderRadius: 2,
            flexDirection: 'row',
            justifyContent: 'center',
            height: 32,
            marginRight: 12,
            width: 56,
        },
        teamIcon: {
            width: 24,
            height: 24,
        },
        teamIconContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            height: 24,
            width: 24,
        },
        teamIconText: {
            fontFamily: 'Open Sans',
            fontSize: 14,
        },
    };
});

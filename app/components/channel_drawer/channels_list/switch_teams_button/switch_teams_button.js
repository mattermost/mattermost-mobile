// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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
        searching: PropTypes.bool.isRequired,
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
            searching,
            teamsCount,
            theme,
        } = this.props;

        if (!currentTeamId) {
            return null;
        }

        if (searching || teamsCount < 2) {
            return null;
        }

        const styles = getStyleSheet(theme);

        const badge = (
            <Badge
                style={styles.badge}
                countStyle={styles.mention}
                count={mentionCount}
                minHeight={20}
                minWidth={20}
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
                        <View style={styles.switcherDivider}/>
                        <TeamIcon
                            teamId={currentTeamId}
                            styleContainer={styles.teamIconContainer}
                            styleText={styles.teamIconText}
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
        switcherContainer: {
            backgroundColor: theme.sidebarHeaderTextColor,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 32,
            borderRadius: 2,
            marginLeft: 6,
            marginRight: 6,
            paddingHorizontal: 3,
        },
        switcherArrow: {
            color: theme.sidebarHeaderBg,
            marginRight: 3,
        },
        switcherDivider: {
            backgroundColor: theme.sidebarHeaderBg,
            height: 15,
            marginHorizontal: 6,
            width: 1,
        },
        teamIconContainer: {
            width: 26,
            height: 26,
            marginLeft: 3,
        },
        teamIconText: {
            fontSize: 14,
        },
        badge: {
            backgroundColor: theme.mentionBj,
            borderColor: theme.sidebarHeaderBg,
            borderRadius: 10,
            borderWidth: 1,
            flexDirection: 'row',
            padding: 3,
            position: 'absolute',
            left: -5,
            top: -5,
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10,
        },
    };
});

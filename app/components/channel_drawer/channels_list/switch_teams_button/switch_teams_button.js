// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';

import Badge from 'app/components/badge';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class SwitchTeamsButton extends React.PureComponent {
    static propTypes = {
        currentTeamId: PropTypes.string,
        displayName: PropTypes.string,
        searching: PropTypes.bool.isRequired,
        onShowTeams: PropTypes.func.isRequired,
        mentionCount: PropTypes.number.isRequired,
        teamsCount: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired
    };

    showTeams = wrapWithPreventDoubleTap(() => {
        this.props.onShowTeams();
    });

    render() {
        const {
            currentTeamId,
            displayName,
            mentionCount,
            searching,
            teamsCount,
            theme
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
                            color={theme.sidebarHeaderBg}
                        />
                        <View style={styles.switcherDivider}/>
                        <Text style={styles.switcherTeam}>
                            {displayName.substr(0, 2).toUpperCase()}
                        </Text>
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
            alignItems: 'center',
            backgroundColor: theme.sidebarHeaderTextColor,
            borderRadius: 2,
            flexDirection: 'row',
            height: 32,
            justifyContent: 'center',
            marginLeft: 6,
            marginRight: 10,
            paddingHorizontal: 6
        },
        switcherDivider: {
            backgroundColor: theme.sidebarHeaderBg,
            height: 15,
            marginHorizontal: 6,
            width: 1
        },
        switcherTeam: {
            color: theme.sidebarHeaderBg,
            fontFamily: 'OpenSans',
            fontSize: 14
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
            top: -5
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10
        }
    };
});

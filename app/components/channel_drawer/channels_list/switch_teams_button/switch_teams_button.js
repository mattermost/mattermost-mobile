// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    Text,
    Image,
    TouchableHighlight,
    View,
} from 'react-native';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';

import Badge from 'app/components/badge';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {Client4} from 'mattermost-redux/client';

export default class SwitchTeamsButton extends React.PureComponent {
    static propTypes = {
        currentTeamId: PropTypes.string,
        displayName: PropTypes.string,
        searching: PropTypes.bool.isRequired,
        onShowTeams: PropTypes.func.isRequired,
        mentionCount: PropTypes.number.isRequired,
        teamsCount: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired,
        lastTeamIconUpdate: PropTypes.number
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
            theme,
            lastTeamIconUpdate
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

        let teamIconContent;
        if (lastTeamIconUpdate) {
            const teamIconUrl = Client4.getTeamIconUrl(currentTeamId, lastTeamIconUpdate);
            teamIconContent = (
                <Image
                    source={{uri: teamIconUrl}}
                    style={styles.switcherTeamIconImage}
                />
            );
        } else {
            teamIconContent = (
                <Text style={styles.switcherTeamIconText}>
                    {displayName.substr(0, 2).toUpperCase()}
                </Text>
            );
        }

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
                        <View style={styles.switcherTeamIconContainer}>
                            {teamIconContent}
                        </View>
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
            paddingHorizontal: 3
        },
        switcherArrow: {
            color: theme.sidebarHeaderBg,
            marginRight: 3
        },
        switcherTeamIconContainer: {
            marginLeft: 3,
            width: 26,
            height: 26,
            justifyContent: 'center',
            alignItems: 'stretch'
        },
        switcherTeamIconImage: {
            flex: 1,
            borderRadius: 2
        },
        switcherTeamIconText: {
            fontFamily: 'OpenSans',
            color: theme.sidebarHeaderBg,
            fontSize: 14,
            textAlign: 'center'
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

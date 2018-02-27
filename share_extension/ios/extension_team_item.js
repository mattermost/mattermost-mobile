// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    Image,
    TouchableHighlight,
    View,
} from 'react-native';

import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {Client4} from 'mattermost-redux/client';

export default class TeamsListItem extends React.PureComponent {
    static propTypes = {
        currentTeamId: PropTypes.string.isRequired,
        onSelectTeam: PropTypes.func.isRequired,
        team: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    onPress = wrapWithPreventDoubleTap(() => {
        const {onSelectTeam, team} = this.props;
        onSelectTeam(team);
    });

    render() {
        const {
            currentTeamId,
            team,
            theme,
        } = this.props;
        const styles = getStyleSheet(theme);

        const wrapperStyle = [styles.wrapper];
        if (team.id === currentTeamId) {
            wrapperStyle.push({
                width: '90%',
            });
        }

        let teamIconContainer;
        if (team.last_team_icon_update) {
            const teamIconUrl = Client4.getTeamIconUrl(team.id, team.last_team_icon_update);
            teamIconContainer = (
                <Image
                    source={{uri: teamIconUrl}}
                    style={styles.teamIconImage}
                />
            );
        } else {
            teamIconContainer = (
                <View style={styles.teamIconContainer}>
                    <Text style={styles.teamIcon}>
                        {team.display_name.substr(0, 2).toUpperCase()}
                    </Text>
                </View>
            );
        }

        return (
            <TouchableHighlight
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={this.onPress}
                style={styles.wrapper}
            >
                <View style={styles.container}>
                    <View style={styles.item}>
                        {teamIconContainer}
                        <Text
                            style={[styles.text]}
                            ellipsizeMode='tail'
                            numberOfLines={1}
                        >
                            {team.display_name}
                        </Text>
                    </View>
                </View>
            </TouchableHighlight>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        wrapper: {
            height: 45,
            width: '100%',
        },
        container: {
            flex: 1,
            flexDirection: 'row',
            height: 45,
            paddingHorizontal: 15,
        },
        item: {
            alignItems: 'center',
            height: 45,
            flex: 1,
            flexDirection: 'row',
        },
        text: {
            color: theme.centerChannelColor,
            flex: 1,
            fontSize: 16,
            fontWeight: '600',
            lineHeight: 16,
            paddingRight: 5,
        },
        teamIconContainer: {
            alignItems: 'center',
            backgroundColor: theme.linkColor,
            borderRadius: 2,
            height: 30,
            width: 30,
            marginRight: 10,
            justifyContent: 'center',
        },
        teamIconImage: {
            borderRadius: 2,
            height: 30,
            width: 30,
            marginRight: 10,
        },
        teamIcon: {
            color: theme.sidebarText,
            fontFamily: 'OpenSans',
            fontSize: 15,
            fontWeight: '600',
        },
        checkmarkContainer: {
            alignItems: 'flex-end',
        },
        checkmark: {
            color: theme.linkColor,
            fontSize: 16,
        },
    };
});

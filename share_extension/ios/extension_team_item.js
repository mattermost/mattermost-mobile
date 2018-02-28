// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableHighlight,
    View,
} from 'react-native';

import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import TeamIcon from 'app/components/team_icon';

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

        return (
            <TouchableHighlight
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={this.onPress}
                style={styles.wrapper}
            >
                <View style={styles.container}>
                    <View style={styles.item}>
                        <TeamIcon
                            teamId={team.id}
                            displayName={team.display_name}
                            lastTeamIconUpdate={team.last_team_icon_update}
                            theme={theme}
                            styleContainer={styles.teamIconContainer}
                            styleText={styles.teamIconText}
                        />
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
            marginRight: 10,
        },
        teamIconText: {
            fontSize: 15,
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

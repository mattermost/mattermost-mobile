// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableHighlight,
    View,
} from 'react-native';

import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import TeamIcon from 'app/components/team_icon/team_icon';

export default class TeamsListItem extends React.PureComponent {
    static propTypes = {
        currentTeamId: PropTypes.string.isRequired,
        onSelectTeam: PropTypes.func.isRequired,
        team: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    onPress = preventDoubleTap(() => {
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
                            styleContainer={styles.teamIconContainer}
                            styleText={styles.teamIconText}
                            styleImage={styles.imageContainer}
                            teamId={team.id}
                            team={team}
                            theme={theme}
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
            backgroundColor: theme.sidebarBg,
            marginRight: 10,
        },
        teamIconText: {
            color: theme.sidebarText,
        },
        imageContainer: {
            backgroundColor: '#ffffff',
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

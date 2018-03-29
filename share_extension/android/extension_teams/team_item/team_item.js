// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableHighlight,
    View,
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';

import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import TeamIcon from 'app/components/team_icon';

export default class TeamItem extends PureComponent {
    static propTypes = {
        currentTeamId: PropTypes.string.isRequired,
        onSelectTeam: PropTypes.func.isRequired,
        team: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    onPress = preventDoubleTap(() => {
        const {onSelectTeam, team} = this.props;
        onSelectTeam(team.id);
    });

    render() {
        const {
            currentTeamId,
            team,
            theme,
        } = this.props;
        const styles = getStyleSheet(theme);

        let current;
        if (team.id === currentTeamId) {
            current = (
                <View style={styles.checkmarkContainer}>
                    <IonIcon
                        name='md-checkmark'
                        style={styles.checkmark}
                    />
                </View>
            );
        }

        return (
            <TouchableHighlight
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={this.onPress}
            >
                <View style={styles.container}>
                    <View style={styles.item}>
                        <TeamIcon
                            teamId={team.id}
                            styleContainer={styles.teamIconContainer}
                            styleText={styles.teamIconText}
                            styleImage={styles.imageContainer}
                        />
                        <Text
                            style={[styles.text]}
                            ellipsizeMode='tail'
                            numberOfLines={1}
                        >
                            {team.display_name}
                        </Text>
                        {current}
                    </View>
                </View>
            </TouchableHighlight>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
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
            backgroundColor: theme.centerChannelBg,
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

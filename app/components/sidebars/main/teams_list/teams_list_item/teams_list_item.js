// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableHighlight,
    View,
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';

import Badge from 'app/components/badge';
import TeamIcon from 'app/components/team_icon';
import {paddingLeft as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class TeamsListItem extends React.PureComponent {
    static propTypes = {
        currentTeamId: PropTypes.string.isRequired,
        currentUrl: PropTypes.string.isRequired,
        displayName: PropTypes.string.isRequired,
        mentionCount: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        selectTeam: PropTypes.func.isRequired,
        teamId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    selectTeam = preventDoubleTap(() => {
        this.props.selectTeam(this.props.teamId);
    });

    render() {
        const {
            currentTeamId,
            currentUrl,
            displayName,
            mentionCount,
            name,
            teamId,
            theme,
            isLandscape,
        } = this.props;
        const styles = getStyleSheet(theme);

        const badge = (
            <Badge
                containerStyle={styles.badgeContainer}
                countStyle={styles.mention}
                count={mentionCount}
                minWidth={20}
                style={styles.badge}
            />
        );

        let current;
        if (teamId === currentTeamId) {
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
            <View style={styles.teamWrapper}>
                <TouchableHighlight
                    underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                    onPress={this.selectTeam}
                >
                    <View style={[styles.teamContainer, padding(isLandscape)]}>
                        <View>
                            <TeamIcon
                                teamId={teamId}
                                styleContainer={styles.teamIconContainer}
                                styleText={styles.teamIconText}
                            />
                            {badge}
                        </View>
                        <View style={styles.teamNameContainer}>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode='tail'
                                style={styles.teamName}
                            >
                                {displayName}
                            </Text>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode='tail'
                                style={styles.teamUrl}
                            >
                                {`${currentUrl}/${name}`}
                            </Text>
                        </View>
                        {current}
                    </View>
                </TouchableHighlight>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        teamWrapper: {
            marginTop: 10,
        },
        teamContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            marginHorizontal: 16,
            paddingVertical: 10,
        },
        teamNameContainer: {
            flex: 1,
            flexDirection: 'column',
            marginLeft: 10,
        },
        teamName: {
            color: theme.sidebarText,
            fontSize: 18,
        },
        teamIconContainer: {
            width: 40,
            height: 40,
            backgroundColor: '#ffffff',
        },
        teamIconText: {
            fontSize: 18,
        },
        teamUrl: {
            color: changeOpacity(theme.sidebarText, 0.5),
            fontSize: 12,
        },
        checkmarkContainer: {
            alignItems: 'flex-end',
        },
        checkmark: {
            color: theme.sidebarText,
            fontSize: 20,
        },
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
            right: -12,
            top: -10,
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10,
        },
    };
});

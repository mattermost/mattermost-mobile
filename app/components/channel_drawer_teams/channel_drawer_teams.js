// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    InteractionManager,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';

import Badge from 'app/components/badge';
import FormattedText from 'app/components/formatted_text';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelDrawerTeams extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleTeamChange: PropTypes.func.isRequired
        }).isRequired,
        canCreateTeams: PropTypes.bool.isRequired,
        canJoinTeams: PropTypes.bool.isRequired,
        closeChannelDrawer: PropTypes.func.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        currentUrl: PropTypes.string.isRequired,
        myTeamMembers: PropTypes.object.isRequired,
        teams: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired
    };

    selectTeam = (team) => {
        const {actions, closeChannelDrawer, currentTeamId} = this.props;
        if (team.id === currentTeamId) {
            closeChannelDrawer();
        } else {
            closeChannelDrawer();
            InteractionManager.runAfterInteractions(() => {
                actions.handleTeamChange(team);
            });
        }
    };

    renderItem = ({item}) => {
        const {currentTeamId, currentUrl, myTeamMembers, theme} = this.props;
        const styles = getStyleSheet(theme);

        let current;
        let badge;
        if (item.id === currentTeamId) {
            current = (
                <View style={styles.checkmarkContainer}>
                    <IonIcon
                        name='md-checkmark'
                        style={styles.checkmark}
                    />
                </View>
            );
        } else {
            const member = myTeamMembers[item.id];

            let badgeCount = 0;
            if (member.mention_count) {
                badgeCount = member.mention_count;
            } else if (member.msg_count) {
                badgeCount = -1;
            }

            if (badgeCount) {
                badge = (
                    <Badge
                        style={styles.badge}
                        countStyle={styles.mention}
                        count={badgeCount}
                        minHeight={5}
                        minWidth={5}
                    />
                );
            }
        }

        return (
            <View style={styles.teamWrapper}>
                <TouchableHighlight
                    underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                    onPress={() => preventDoubleTap(this.selectTeam, this, item)}
                >
                    <View style={styles.teamContainer}>
                        <View style={styles.teamIconContainer}>
                            <Text style={styles.teamIcon}>
                                {item.display_name.substr(0, 2).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.teamNameContainer}>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode='tail'
                                style={styles.teamName}
                            >
                                {item.display_name}
                            </Text>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode='tail'
                                style={styles.teamUrl}
                            >
                                {`${currentUrl}/${item.name}`}
                            </Text>
                        </View>
                        {current}
                    </View>
                </TouchableHighlight>
                {badge}
            </View>
        );
    };

    render() {
        const {teams, theme} = this.props;
        const styles = getStyleSheet(theme);

        let moreAction;

        return (
            <View style={styles.container}>
                <View style={styles.statusBar}>
                    <View style={styles.headerContainer}>
                        <FormattedText
                            id='mobile.drawer.teamsTitle'
                            defaultMessage='Teams'
                            style={styles.header}
                        />
                        {moreAction}
                    </View>
                </View>
                <FlatList
                    data={teams}
                    renderItem={this.renderItem}
                    keyExtractor={(item) => item.id}
                    viewabilityConfig={{
                        viewAreaCoveragePercentThreshold: 3,
                        waitForInteraction: false
                    }}
                />
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            backgroundColor: theme.sidebarBg,
            flex: 1
        },
        statusBar: {
            backgroundColor: theme.sidebarHeaderBg,
            ...Platform.select({
                ios: {
                    paddingTop: 20
                }
            })
        },
        headerContainer: {
            alignItems: 'center',
            backgroundColor: theme.sidebarHeaderBg,
            flexDirection: 'row',
            paddingLeft: 16,
            borderBottomWidth: 1,
            borderBottomColor: changeOpacity(theme.sidebarHeaderTextColor, 0.10),
            ...Platform.select({
                android: {
                    height: 46
                },
                ios: {
                    height: 44
                }
            })
        },
        header: {
            color: theme.sidebarHeaderTextColor,
            flex: 1,
            fontSize: 17,
            fontWeight: 'normal'
        },
        teamWrapper: {
            marginTop: 20
        },
        teamContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            marginHorizontal: 16
        },
        teamIconContainer: {
            alignItems: 'center',
            backgroundColor: theme.sidebarText,
            borderRadius: 2,
            height: 40,
            justifyContent: 'center',
            width: 40
        },
        teamIcon: {
            color: theme.sidebarBg,
            fontFamily: 'OpenSans',
            fontSize: 18,
            fontWeight: '600'
        },
        teamNameContainer: {
            flex: 1,
            flexDirection: 'column',
            marginLeft: 10
        },
        teamName: {
            color: theme.sidebarText,
            fontSize: 18
        },
        teamUrl: {
            color: changeOpacity(theme.sidebarText, 0.5),
            fontSize: 12
        },
        checkmarkContainer: {
            alignItems: 'flex-end'
        },
        checkmark: {
            color: theme.sidebarText,
            fontSize: 20
        },
        badge: {
            backgroundColor: theme.mentionBj,
            borderColor: theme.sidebarHeaderBg,
            borderRadius: 10,
            borderWidth: 1,
            flexDirection: 'row',
            height: 20,
            padding: 3,
            position: 'absolute',
            left: 45,
            top: -7.5,
            width: 20
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10
        }
    });
});

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

export default class SwitchTeams extends React.PureComponent {
    static propTypes = {
        currentTeam: PropTypes.object.isRequired,
        searching: PropTypes.bool.isRequired,
        showTeams: PropTypes.func.isRequired,
        teamMembers: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            badgeCount: this.getBadgeCount(props)
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.currentTeam !== this.props.currentTeam || nextProps.teamMembers !== this.props.teamMembers) {
            this.setState({
                badgeCount: this.getBadgeCount(nextProps)
            });
        }
    }

    getBadgeCount = (props) => {
        const {
            currentTeam,
            teamMembers
        } = props;

        let mentionCount = 0;
        let messageCount = 0;
        Object.values(teamMembers).forEach((m) => {
            if (m.team_id !== currentTeam.id) {
                mentionCount = mentionCount + (m.mention_count || 0);
                messageCount = messageCount + (m.msg_count || 0);
            }
        });

        let badgeCount;
        if (mentionCount) {
            badgeCount = mentionCount;
        } else if (messageCount) {
            badgeCount = -1;
        } else {
            badgeCount = 0;
        }

        return badgeCount;
    };

    showTeams = wrapWithPreventDoubleTap(() => {
        this.props.showTeams();
    });

    render() {
        const {
            currentTeam,
            searching,
            teamMembers,
            theme
        } = this.props;

        const {
            badgeCount
        } = this.state;

        if (searching || teamMembers.length < 2) {
            return null;
        }

        const styles = getStyleSheet(theme);

        let badge;
        if (badgeCount) {
            badge = (
                <Badge
                    style={styles.badge}
                    countStyle={styles.mention}
                    count={badgeCount}
                    minHeight={20}
                    minWidth={20}
                />
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
                            color={theme.sidebarHeaderBg}
                        />
                        <View style={styles.switcherDivider}/>
                        <Text style={styles.switcherTeam}>
                            {currentTeam.display_name.substr(0, 2).toUpperCase()}
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

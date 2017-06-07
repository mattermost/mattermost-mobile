// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    FlatList,
    InteractionManager,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import FormattedText from 'app/components/formatted_text';
import Loading from 'app/components/loading';
import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class SelectTeam extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getTeams: PropTypes.func.isRequired,
            handleTeamChange: PropTypes.func.isRequired,
            joinTeam: PropTypes.func.isRequired,
            markChannelAsRead: PropTypes.func.isRequired
        }).isRequired,
        currentChannelId: PropTypes.string,
        currentUrl: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        teams: PropTypes.array.isRequired,
        theme: PropTypes.object
    };

    constructor(props) {
        super(props);
        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);

        this.state = {
            joining: false
        };
    }

    close = () => {
        this.props.navigator.dismissModal({
            animationType: 'slide-down'
        });
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            if (event.id === 'close-teams') {
                this.close();
            }
        }
    };

    onSelectTeam = async (team) => {
        this.setState({joining: true});
        const {currentChannelId} = this.props;
        const {
            joinTeam,
            handleTeamChange,
            markChannelAsRead
        } = this.props.actions;

        if (currentChannelId) {
            markChannelAsRead(currentChannelId);
        }
        await joinTeam(team.invite_id, team.id);
        handleTeamChange(team);
        EventEmitter.emit('close_channel_drawer');
        InteractionManager.runAfterInteractions(() => {
            this.close();
        });
    };

    renderItem = ({item}) => {
        const {currentUrl, theme} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <View style={styles.teamWrapper}>
                <TouchableOpacity
                    onPress={() => preventDoubleTap(this.onSelectTeam, this, item)}
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
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    render() {
        const {teams, theme} = this.props;
        const styles = getStyleSheet(theme);

        if (this.state.joining) {
            return <Loading/>;
        }

        return (
            <View style={styles.container}>
                <StatusBar/>
                <View style={styles.headingContainer}>
                    <View style={styles.headingWrapper}>
                        <FormattedText
                            id='mobile.select_team.join_open'
                            defaultMessage='Open teams you can join'
                            style={styles.heading}
                        />
                    </View>
                    <View style={styles.line}/>
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
            backgroundColor: theme.centerChannelBg,
            flex: 1
        },
        headingContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            marginHorizontal: 16,
            marginTop: 20
        },
        headingWrapper: {
            marginRight: 15
        },
        heading: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 13
        },
        line: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            width: '100%',
            height: StyleSheet.hairlineWidth
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
            backgroundColor: theme.buttonBg,
            borderRadius: 2,
            height: 40,
            justifyContent: 'center',
            width: 40
        },
        teamIcon: {
            color: theme.buttonColor,
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
            color: theme.centerChannelColor,
            fontSize: 18
        },
        teamUrl: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 12
        }
    });
});

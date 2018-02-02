// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {ActivityIndicator, FlatList, Text, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {intlShape} from 'react-intl';

import {General} from 'mattermost-redux/constants';
import {getChannelsInTeam} from 'mattermost-redux/selectors/entities/channels';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ExtensionNavBar from './extension_nav_bar';
import ExtensionTeamItem from './extension_team_item';

export default class ExtensionTeams extends PureComponent {
    static propTypes = {
        currentTeamId: PropTypes.string.isRequired,
        entities: PropTypes.object,
        navigator: PropTypes.object.isRequired,
        onSelectTeam: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired
    };

    static contextTypes = {
        intl: intlShape
    };

    state = {
        defaultChannels: null,
        error: null,
        myTeams: null
    };

    componentWillMount() {
        this.loadTeams();
    }

    goBack = () => {
        this.props.navigator.pop();
    };

    handleSelectTeam = (team) => {
        const {defaultChannels} = this.state;
        const townSquare = defaultChannels[team.id];
        this.props.onSelectTeam(team, townSquare);
        this.goBack();
    };

    keyExtractor = (item) => item.id;

    loadTeams = async () => {
        try {
            const defaultChannels = {};
            const {teams, myMembers} = this.props.entities.teams;
            const myTeams = [];
            const channelsInTeam = getChannelsInTeam({entities: this.props.entities});

            for (const key in teams) {
                if (teams.hasOwnProperty(key)) {
                    const team = teams[key];
                    const belong = myMembers[key];
                    if (belong) {
                        const channelIds = channelsInTeam[key];
                        let channels;
                        if (channelIds) {
                            channels = channelIds.map((id) => this.props.entities.channels.channels[id]);
                            defaultChannels[team.id] = channels.find((channel) => channel.name === General.DEFAULT_CHANNEL);
                        }

                        myTeams.push(team);
                    }
                }
            }

            this.setState({
                defaultChannels,
                myTeams: myTeams.sort(this.sortDisplayName)
            });
        } catch (error) {
            this.setState({error});
        }
    };

    renderBody = (styles) => {
        const {error, myTeams} = this.state;

        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.error}>
                        {error.message}
                    </Text>
                </View>
            );
        }

        if (!myTeams) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator/>
                </View>
            );
        }

        return (
            <FlatList
                data={myTeams}
                ItemSeparatorComponent={this.renderItemSeparator}
                renderItem={this.renderItem}
                keyExtractor={this.keyExtractor}
                keyboardShouldPersistTaps='always'
                keyboardDismissMode='on-drag'
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                scrollEventThrottle={100}
                windowSize={5}
            />
        );
    };

    renderItem = ({item}) => {
        const {currentTeamId, theme} = this.props;

        return (
            <ExtensionTeamItem
                currentTeamId={currentTeamId}
                onSelectTeam={this.handleSelectTeam}
                team={item}
                theme={theme}
            />
        );
    };

    renderItemSeparator = () => {
        const {theme} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <View style={styles.separatorContainer}>
                <View style={styles.separator}/>
            </View>
        );
    };

    sortDisplayName = (a, b) => {
        const locale = DeviceInfo.getDeviceLocale().split('-')[0];
        return a.display_name.localeCompare(b.display_name, locale, {numeric: true});
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {theme} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <View style={styles.flex}>
                <ExtensionNavBar
                    backButton={true}
                    onLeftButtonPress={this.goBack}
                    title={formatMessage({id: 'mobile.drawer.teamsTitle', defaultMessage: 'Teams'})}
                    theme={theme}
                />
                {this.renderBody(styles)}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1
        },
        separatorContainer: {
            paddingLeft: 60
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1
        },
        loadingContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center'
        },
        searchContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            paddingBottom: 2
        },
        searchBarInput: {
            backgroundColor: '#fff',
            color: theme.centerChannelColor,
            fontSize: 15
        },
        titleContainer: {
            height: 30
        },
        title: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 15,
            lineHeight: 30,
            paddingHorizontal: 15
        },
        errorContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 15
        },
        error: {
            color: theme.errorTextColor,
            fontSize: 14
        }
    };
});

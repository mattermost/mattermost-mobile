// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {ActivityIndicator, FlatList, Text, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {intlShape} from 'react-intl';

import {Client4} from 'mattermost-redux/client';
import {General} from 'mattermost-redux/constants';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ExtensionNavBar from './extension_nav_bar';
import ExtensionTeamItem from './extension_team_item';

export default class ExtensionTeams extends PureComponent {
    static propTypes = {
        currentTeamId: PropTypes.string.isRequired,
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
            const teams = await Client4.getMyTeams();
            const myMembers = await Client4.getMyTeamMembers();
            const myTeams = teams.filter(async (team) => {
                const belong = myMembers.find((member) => member.team_id === team.id);
                if (belong) {
                    const channels = await Client4.getMyChannels(team.id);
                    defaultChannels[team.id] = channels.find((channel) => channel.name === General.DEFAULT_CHANNEL);
                    return true;
                }

                return false;
            }).sort(this.sortDisplayName);

            this.setState({defaultChannels, myTeams});
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

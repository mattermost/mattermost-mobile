// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {ActivityIndicator, Text, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {intlShape} from 'react-intl';
import TableView from 'react-native-tableview';

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
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    state = {
        defaultChannels: null,
        error: null,
        myTeams: null,
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
                myTeams: myTeams.sort(this.sortDisplayName),
            });
        } catch (error) {
            this.setState({error});
        }
    };

    renderBody = (styles) => {
        const {theme} = this.props;
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
            <TableView
                tableViewStyle={TableView.Consts.Style.Plain}
                tableViewCellStyle={TableView.Consts.CellStyle.Default}
                separatorColor={changeOpacity(theme.centerChannelColor, 0.5)}
                tintColor={theme.linkColor}
                detailFontSize={16}
                detailTextColor={theme.centerChannelColor}
                headerFontSize={15}
                headerTextColor={changeOpacity(theme.centerChannelColor, 0.6)}
                style={styles.flex}
            >
                <TableView.Section>
                    {this.renderItems(myTeams)}
                </TableView.Section>
            </TableView>
        );
    };

    renderItems = (myTeams) => {
        const {currentTeamId, theme} = this.props;

        return myTeams.map((team) => {
            return (
                <TableView.Cell
                    key={team.id}
                    selected={team.id === currentTeamId}
                >
                    <View>
                        <ExtensionTeamItem
                            currentTeamId={currentTeamId}
                            onSelectTeam={this.handleSelectTeam}
                            team={team}
                            theme={theme}
                        />
                    </View>
                </TableView.Cell>
            );
        });
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
            flex: 1,
        },
        separatorContainer: {
            paddingLeft: 60,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
        },
        loadingContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
        },
        searchContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            paddingBottom: 2,
        },
        searchBarInput: {
            backgroundColor: '#fff',
            color: theme.centerChannelColor,
            fontSize: 15,
        },
        titleContainer: {
            height: 30,
        },
        title: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 15,
            lineHeight: 30,
            paddingHorizontal: 15,
        },
        errorContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 15,
        },
        error: {
            color: theme.errorTextColor,
            fontSize: 14,
        },
    };
});

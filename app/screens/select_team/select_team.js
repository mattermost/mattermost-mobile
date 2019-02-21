// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    InteractionManager,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import FailedNetworkAction from 'app/components/failed_network_action';
import FormattedText from 'app/components/formatted_text';
import Loading from 'app/components/loading';
import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';
import {t} from 'app/utils/i18n';
import CustomList from 'app/components/custom_list';

import TeamIcon from 'app/components/team_icon';

const TEAMS_PER_PAGE = 50;

const errorTitle = {
    id: t('error.team_not_found.title'),
    defaultMessage: 'Team Not Found',
};

const errorDescription = {
    id: t('mobile.failed_network_action.shortDescription'),
    defaultMessage: 'Make sure you have an active connection and try again.',
};

export default class SelectTeam extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getTeams: PropTypes.func.isRequired,
            handleTeamChange: PropTypes.func.isRequired,
            joinTeam: PropTypes.func.isRequired,
            logout: PropTypes.func.isRequired,
        }).isRequired,
        currentUrl: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        userWithoutTeams: PropTypes.bool,
        teams: PropTypes.array.isRequired,
        theme: PropTypes.object,
        teamsRequest: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);

        this.state = {
            loading: false,
            joining: false,
            teams: [],
            page: 0,
            refreshing: false,
        };
    }

    componentDidMount() {
        this.getTeams();
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }

        if (this.props.teams !== nextProps.teams) {
            this.buildData(nextProps);
        }
    }

    getTeams = () => {
        this.setState({loading: true});
        this.props.actions.getTeams(this.state.page, TEAMS_PER_PAGE).then(() => {
            this.setState((state) => ({
                loading: false,
                refreshing: false,
                page: state.page + 1,
            }));
        });
    }

    buildData = (props) => {
        if (props.teams.length) {
            this.setState({teams: props.teams});
        } else {
            const teams = [{
                id: t('mobile.select_team.no_teams'),
                defaultMessage: 'There are no available teams for you to join.',
            }];
            this.setState({teams});
        }
    };

    close = () => {
        this.props.navigator.dismissModal({
            animationType: 'slide-down',
        });
    };

    goToChannelView = () => {
        const {navigator, theme} = this.props;

        navigator.resetTo({
            screen: 'Channel',
            animated: false,
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: theme.centerChannelBg,
            },
            passProps: {
                disableTermsModal: true,
            },
        });
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            const {logout} = this.props.actions;

            switch (event.id) {
            case 'close-teams':
                this.close();
                break;
            case 'logout':
                InteractionManager.runAfterInteractions(logout);
                break;
            }
        }
    };

    onSelectTeam = async (team) => {
        this.setState({joining: true});
        const {userWithoutTeams} = this.props;
        const {
            joinTeam,
            handleTeamChange,
        } = this.props.actions;

        const {error} = await joinTeam(team.invite_id, team.id);
        if (error) {
            Alert.alert(error.message);
            this.setState({joining: false});
            return;
        }

        handleTeamChange(team.id);

        if (userWithoutTeams) {
            this.goToChannelView();
        } else {
            EventEmitter.emit('close_channel_drawer');
            InteractionManager.runAfterInteractions(() => {
                this.close();
            });
        }
    };

    onRefresh = () => {
        this.setState({page: 0, refreshing: true}, () => {
            this.getTeams();
        });
    }

    renderItem = ({item}) => {
        const {currentUrl, theme} = this.props;
        const styles = getStyleSheet(theme);

        if (item.id === 'mobile.select_team.no_teams') {
            return (
                <View style={styles.teamWrapper}>
                    <View style={styles.teamContainer}>
                        <FormattedText
                            id={item.id}
                            defaultMessage={item.defaultMessage}
                            style={styles.noTeam}
                        />
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.teamWrapper}>
                <TouchableOpacity
                    onPress={preventDoubleTap(() => this.onSelectTeam(item))}
                >
                    <View style={styles.teamContainer}>
                        <TeamIcon
                            teamId={item.id}
                            styleContainer={styles.teamIconContainer}
                            styleText={styles.teamIconText}
                            styleImage={styles.imageContainer}
                        />
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
        const {theme} = this.props;
        const {teams} = this.state;
        const styles = getStyleSheet(theme);

        if (this.state.joining) {
            return <Loading/>;
        }

        if (this.props.teamsRequest.status === RequestStatus.FAILURE) {
            return (
                <FailedNetworkAction
                    onRetry={this.getTeams}
                    theme={theme}
                    errorTitle={errorTitle}
                    errorDescription={errorDescription}
                />
            );
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
                <CustomList
                    data={teams}
                    loading={this.state.loading}
                    loadingComponent={<Loading/>}
                    refreshing={this.state.refreshing}
                    onRefresh={this.onRefresh}
                    onLoadMore={this.getTeams}
                    renderItem={this.renderItem}
                    theme={theme}
                    extraData={this.state.loading}
                    shouldRenderSeparator={false}
                />
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
        headingContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            marginHorizontal: 16,
            marginTop: 20,
        },
        headingWrapper: {
            marginRight: 15,
        },
        heading: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 13,
        },
        line: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            width: '100%',
            height: 1,
        },
        teamWrapper: {
            marginTop: 20,
        },
        teamContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            marginHorizontal: 16,
        },
        teamIconContainer: {
            width: 40,
            height: 40,
            backgroundColor: theme.sidebarBg,
        },
        teamIconText: {
            color: theme.sidebarText,
            fontSize: 18,
        },
        imageContainer: {
            backgroundColor: '#FFF',
        },
        noTeam: {
            color: theme.centerChannelColor,
            fontSize: 14,
        },
        teamNameContainer: {
            flex: 1,
            flexDirection: 'column',
            marginLeft: 10,
        },
        teamName: {
            color: theme.centerChannelColor,
            fontSize: 18,
        },
        teamUrl: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 12,
        },
    };
});

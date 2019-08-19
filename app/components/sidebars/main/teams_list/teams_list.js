// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Dimensions,
    FlatList,
    Platform,
    StatusBar,
    Text,
    TouchableHighlight,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import FormattedText from 'app/components/formatted_text';
import {DeviceTypes, ListTypes, ViewTypes} from 'app/constants';
import {getCurrentServerUrl} from 'app/init/credentials';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {removeProtocol} from 'app/utils/url';
import tracker from 'app/utils/time_tracker';
import telemetry from 'app/telemetry';

import TeamsListItem from './teams_list_item';

const {ANDROID_TOP_PORTRAIT} = ViewTypes;
const VIEWABILITY_CONFIG = {
    ...ListTypes.VISIBILITY_CONFIG_DEFAULTS,
    waitForInteraction: true,
};

export default class TeamsList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleTeamChange: PropTypes.func.isRequired,
            showModal: PropTypes.func.isRequired,
        }).isRequired,
        closeChannelDrawer: PropTypes.func.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        hasOtherJoinableTeams: PropTypes.bool,
        teamIds: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            serverUrl: '',
        };

        MaterialIcon.getImageSource('close', 20, props.theme.sidebarHeaderTextColor).then((source) => {
            this.closeButton = source;
        });

        getCurrentServerUrl().then((url) => {
            this.setState({serverUrl: removeProtocol(url)});
        });
    }

    selectTeam = (teamId) => {
        const {actions, closeChannelDrawer, currentTeamId} = this.props;

        if (teamId !== currentTeamId) {
            telemetry.reset();
            telemetry.start(['team:switch']);
        }

        StatusBar.setHidden(false, 'slide');
        requestAnimationFrame(() => {
            if (teamId !== currentTeamId) {
                tracker.teamSwitch = Date.now();
                actions.handleTeamChange(teamId);
            }

            closeChannelDrawer();
        });
    };

    goToSelectTeam = preventDoubleTap(async () => {
        const {intl} = this.context;
        const {theme, actions} = this.props;
        const {serverUrl} = this.state;
        const screen = 'SelectTeam';
        const title = intl.formatMessage({id: 'mobile.routes.selectTeam', defaultMessage: 'Select Team'});
        const passProps = {
            currentUrl: serverUrl,
            theme,
        };
        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-teams',
                    icon: this.closeButton,
                }],
            },
        };

        actions.showModal(screen, title, passProps, options);
    });

    keyExtractor = (item) => {
        return item;
    };

    listContentPadding = () => {
        if (DeviceTypes.IS_TABLET) {
            return 64;
        }

        const {width, height} = Dimensions.get('window');
        const landscape = width > height;
        if (DeviceTypes.IS_IPHONE_X) {
            return landscape ? 54 : 44;
        }

        return 64;
    };

    renderItem = ({item}) => {
        return (
            <TeamsListItem
                currentUrl={this.state.serverUrl}
                selectTeam={this.selectTeam}
                teamId={item}
            />
        );
    };

    render() {
        const {hasOtherJoinableTeams, teamIds, theme} = this.props;
        const styles = getStyleSheet(theme);

        let moreAction;
        if (hasOtherJoinableTeams) {
            moreAction = (
                <TouchableHighlight
                    style={styles.moreActionContainer}
                    onPress={this.goToSelectTeam}
                    underlayColor={changeOpacity(theme.sidebarHeaderBg, 0.5)}
                >
                    <Text
                        style={styles.moreAction}
                    >
                        {'+'}
                    </Text>
                </TouchableHighlight>
            );
        }

        return (
            <View style={styles.container}>
                <View style={styles.headerContainer}>
                    <FormattedText
                        id='mobile.drawer.teamsTitle'
                        defaultMessage='Teams'
                        style={styles.header}
                    />
                    {moreAction}
                </View>
                <FlatList
                    extraData={this.state.serverUrl}
                    contentContainerStyle={this.listContentPadding()}
                    data={teamIds}
                    renderItem={this.renderItem}
                    keyExtractor={this.keyExtractor}
                    viewabilityConfig={VIEWABILITY_CONFIG}
                />
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.sidebarBg,
            flex: 1,
        },
        headerContainer: {
            alignItems: 'center',
            backgroundColor: theme.sidebarBg,
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: changeOpacity(theme.sidebarHeaderTextColor, 0.10),
            ...Platform.select({
                android: {
                    height: ANDROID_TOP_PORTRAIT,
                },
                ios: {
                    height: 44,
                },
            }),
        },
        header: {
            color: theme.sidebarHeaderTextColor,
            flex: 1,
            fontSize: 17,
            textAlign: 'center',
            fontWeight: '600',
        },
        moreActionContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            width: 50,
            ...Platform.select({
                android: {
                    height: ANDROID_TOP_PORTRAIT,
                },
                ios: {
                    height: 44,
                },
            }),
        },
        moreAction: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 30,
        },
    };
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
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
import {ListTypes, ViewTypes} from 'app/constants';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import tracker from 'app/utils/time_tracker';

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
        }).isRequired,
        closeChannelDrawer: PropTypes.func.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        currentUrl: PropTypes.string.isRequired,
        navigator: PropTypes.object.isRequired,
        teamIds: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        MaterialIcon.getImageSource('close', 20, props.theme.sidebarHeaderTextColor).then((source) => {
            this.closeButton = source;
        });
    }

    selectTeam = (teamId) => {
        StatusBar.setHidden(false, 'slide');
        requestAnimationFrame(() => {
            const {actions, closeChannelDrawer, currentTeamId} = this.props;
            if (teamId !== currentTeamId) {
                tracker.teamSwitch = Date.now();
                actions.handleTeamChange(teamId);
            }

            closeChannelDrawer();
        });
    };

    goToSelectTeam = preventDoubleTap(() => {
        const {intl} = this.context;
        const {currentUrl, navigator, theme} = this.props;

        navigator.showModal({
            screen: 'SelectTeam',
            title: intl.formatMessage({id: 'mobile.routes.selectTeam', defaultMessage: 'Select Team'}),
            animationType: 'slide-up',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            navigatorButtons: {
                leftButtons: [{
                    id: 'close-teams',
                    icon: this.closeButton,
                }],
            },
            passProps: {
                currentUrl,
                theme,
            },
        });
    });

    keyExtractor = (item) => {
        return item;
    };

    renderItem = ({item}) => {
        return (
            <TeamsListItem
                selectTeam={this.selectTeam}
                teamId={item}
            />
        );
    };

    render() {
        const {teamIds, theme} = this.props;
        const styles = getStyleSheet(theme);

        const moreAction = (
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
        statusBar: {
            backgroundColor: theme.sidebarHeaderBg,
        },
        headerContainer: {
            alignItems: 'center',
            backgroundColor: theme.sidebarHeaderBg,
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

// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    FlatList,
    Platform,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import FormattedText from 'app/components/formatted_text';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import TeamsListItem from './teams_list_item';

class TeamsList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleTeamChange: PropTypes.func.isRequired
        }).isRequired,
        closeChannelDrawer: PropTypes.func.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        currentUrl: PropTypes.string.isRequired,
        intl: intlShape.isRequired,
        joinableTeams: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired,
        teams: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        MaterialIcon.getImageSource('close', 20, props.theme.sidebarHeaderTextColor).then((source) => {
            this.closeButton = source;
        });
    }

    selectTeam = (team) => {
        requestAnimationFrame(() => {
            const {actions, closeChannelDrawer, currentTeamId} = this.props;
            if (team.id !== currentTeamId) {
                actions.handleTeamChange(team);
            }

            closeChannelDrawer();
        });
    };

    goToSelectTeam = wrapWithPreventDoubleTap(() => {
        const {currentUrl, intl, navigator, theme} = this.props;

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
                screenBackgroundColor: theme.centerChannelBg
            },
            navigatorButtons: {
                leftButtons: [{
                    id: 'close-teams',
                    icon: this.closeButton
                }]
            },
            passProps: {
                currentUrl,
                theme
            }
        });
    });

    keyExtractor = (team) => {
        return team.id;
    }

    renderItem = ({item}) => {
        const {currentTeamId, currentUrl, theme} = this.props;

        return (
            <TeamsListItem
                currentTeamId={currentTeamId}
                currentUrl={currentUrl}
                selectTeam={this.selectTeam}
                team={item}
                theme={theme}
            />
        );
    };

    render() {
        const {joinableTeams, teams, theme} = this.props;
        const styles = getStyleSheet(theme);

        let moreAction;
        if (Object.keys(joinableTeams).length) {
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
                    keyExtractor={this.keyExtractor}
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
    return {
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
            textAlign: 'center',
            fontWeight: '600'
        },
        moreActionContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            width: 50,
            ...Platform.select({
                android: {
                    height: 46
                },
                ios: {
                    height: 44
                }
            })
        },
        moreAction: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 30
        }
    };
});

export default injectIntl(TeamsList);

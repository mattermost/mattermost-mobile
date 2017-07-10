// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import Badge from 'app/components/badge';
import SearchBar from 'app/components/search_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import FilteredList from './filtered_list';
import List from './list';

class ChannelsList extends Component {
    static propTypes = {
        channels: PropTypes.object.isRequired,
        channelMembers: PropTypes.object,
        currentTeam: PropTypes.object.isRequired,
        currentChannel: PropTypes.object,
        intl: intlShape.isRequired,
        myTeamMembers: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        onJoinChannel: PropTypes.func.isRequired,
        onSearchEnds: PropTypes.func.isRequired,
        onSearchStart: PropTypes.func.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        onShowTeams: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        currentTeam: {},
        currentChannel: {}
    };

    constructor(props) {
        super(props);
        this.firstUnreadChannel = null;
        this.state = {
            searching: false,
            term: ''
        };

        MaterialIcon.getImageSource('close', 20, this.props.theme.sidebarHeaderTextColor).
        then((source) => {
            this.closeButton = source;
        });
    }

    onSelectChannel = (channel) => {
        if (channel.fake) {
            this.props.onJoinChannel(channel);
        } else {
            this.props.onSelectChannel(channel);
        }

        this.refs.search_bar.cancel();
    };

    openSettingsModal = () => {
        const {intl, navigator, theme} = this.props;

        navigator.showModal({
            screen: 'Settings',
            title: intl.formatMessage({id: 'mobile.routes.settings', defaultMessage: 'Settings'}),
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
                    id: 'close-settings',
                    icon: this.closeButton
                }]
            }
        });
    };

    onSearch = (term) => {
        this.setState({term});
    };

    onSearchFocused = () => {
        this.setState({searching: true});
        this.props.onSearchStart();
    };

    cancelSearch = () => {
        this.props.onSearchEnds();
        this.setState({searching: false});
        this.onSearch('');
    };

    render() {
        const {
            currentChannel,
            currentTeam,
            intl,
            myTeamMembers,
            onShowTeams,
            theme
        } = this.props;

        if (!currentChannel) {
            return <Text>{'Loading'}</Text>;
        }

        const {searching, term} = this.state;
        const teamMembers = Object.values(myTeamMembers);
        const showMembers = teamMembers.length > 1;
        const styles = getStyleSheet(theme);

        let settings;
        let list;
        if (searching) {
            const listProps = {...this.props, onSelectChannel: this.onSelectChannel, styles, term};
            list = <FilteredList {...listProps}/>;
        } else {
            settings = (
                <TouchableHighlight
                    style={styles.settingsContainer}
                    onPress={() => preventDoubleTap(this.openSettingsModal)}
                    underlayColor={changeOpacity(theme.sidebarHeaderBg, 0.5)}
                >
                    <AwesomeIcon
                        name='cog'
                        style={styles.settings}
                    />
                </TouchableHighlight>
            );

            const listProps = {...this.props, onSelectChannel: this.onSelectChannel, styles};
            list = <List {...listProps}/>;
        }

        const title = (
            <View style={styles.searchContainer}>
                <SearchBar
                    ref='search_bar'
                    placeholder={intl.formatMessage({id: 'mobile.channel_drawer.search', defaultMessage: 'Jump to a conversation'})}
                    cancelTitle={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    backgroundColor='transparent'
                    inputHeight={33}
                    inputStyle={{
                        backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.2),
                        color: theme.sidebarHeaderTextColor,
                        fontSize: 13
                    }}
                    placeholderTextColor={changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                    tintColorSearch={changeOpacity(theme.sidebarHeaderTextColor, 0.8)}
                    tintColorDelete={changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                    titleCancelColor={theme.sidebarHeaderTextColor}
                    onSearchButtonPress={this.onSearch}
                    onCancelButtonPress={this.cancelSearch}
                    onChangeText={this.onSearch}
                    onFocus={this.onSearchFocused}
                    value={term}
                />
            </View>
        );

        let badge;
        let switcher;
        if (showMembers && !searching) {
            let mentionCount = 0;
            let messageCount = 0;
            teamMembers.forEach((m) => {
                if (m.team_id !== currentTeam.id) {
                    mentionCount = mentionCount + (m.mention_count || 0);
                    messageCount = messageCount + (m.msg_count || 0);
                }
            });

            let badgeCount = 0;
            if (mentionCount) {
                badgeCount = mentionCount;
            } else if (messageCount) {
                badgeCount = -1;
            }

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

            switcher = (
                <TouchableHighlight
                    onPress={() => preventDoubleTap(onShowTeams)}
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
            );
        }

        return (
            <View
                style={[styles.container, showMembers ? styles.extraPadding : {}]}
            >
                <View style={styles.statusBar}>
                    <View style={styles.headerContainer}>
                        {switcher}
                        {title}
                        {settings}
                        {badge}
                    </View>
                </View>
                {list}
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
        extraPadding: {
            ...Platform.select({
                ios: {
                    paddingBottom: 10
                }
            })
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
            paddingLeft: 10,
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
            fontWeight: 'normal',
            paddingLeft: 16
        },
        settingsContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 10,
            ...Platform.select({
                android: {
                    height: 46
                },
                ios: {
                    height: 44
                }
            })
        },
        settings: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 18,
            fontWeight: '300'
        },
        titleContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: 48,
            marginLeft: 16
        },
        title: {
            flex: 1,
            color: theme.sidebarText,
            opacity: 1,
            fontSize: 15,
            fontWeight: '400',
            letterSpacing: 0.8,
            lineHeight: 18
        },
        searchContainer: {
            flex: 1,
            ...Platform.select({
                android: {
                    marginBottom: 1
                },
                ios: {
                    marginBottom: 3
                }
            })
        },
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
            left: 5,
            top: 0
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10
        },
        divider: {
            backgroundColor: changeOpacity(theme.sidebarText, 0.1),
            height: 1
        },
        actionContainer: {
            alignItems: 'center',
            height: 48,
            justifyContent: 'center',
            width: 50
        },
        action: {
            color: theme.sidebarText,
            fontSize: 20,
            fontWeight: '500',
            lineHeight: 18
        },
        above: {
            backgroundColor: theme.mentionBj,
            top: 9
        },
        indicatorText: {
            backgroundColor: 'transparent',
            color: theme.mentionColor,
            fontSize: 14,
            paddingVertical: 2,
            paddingHorizontal: 4,
            textAlign: 'center',
            textAlignVertical: 'center'
        }
    });
});

export default injectIntl(ChannelsList);

// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    View,
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import SearchBar from 'app/components/search_bar';
import {ViewTypes} from 'app/constants';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import FilteredList from './filtered_list';
import List from './list';
import SwitchTeamsButton from './switch_teams_button';

const {ANDROID_TOP_PORTRAIT} = ViewTypes;

class ChannelsList extends React.PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        onJoinChannel: PropTypes.func.isRequired,
        onSearchEnds: PropTypes.func.isRequired,
        onSearchStart: PropTypes.func.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        onShowTeams: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            searching: false,
            term: '',
        };

        MaterialIcon.getImageSource('close', 20, this.props.theme.sidebarHeaderTextColor).then((source) => {
            this.closeButton = source;
        });
    }

    onSelectChannel = (channel, currentChannelId) => {
        if (channel.fake) {
            this.props.onJoinChannel(channel, currentChannelId);
        } else {
            this.props.onSelectChannel(channel, currentChannelId);
        }

        if (this.refs.search_bar) {
            this.refs.search_bar.cancel();
        }
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
            intl,
            navigator,
            onShowTeams,
            theme,
        } = this.props;

        const {searching, term} = this.state;
        const styles = getStyleSheet(theme);

        let list;
        if (searching) {
            list = (
                <FilteredList
                    onSelectChannel={this.onSelectChannel}
                    styles={styles}
                    term={term}
                />
            );
        } else {
            list = (
                <List
                    navigator={navigator}
                    onSelectChannel={this.onSelectChannel}
                    styles={styles}
                />
            );
        }

        const searchBarInput = {
            backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.2),
            color: theme.sidebarHeaderTextColor,
            fontSize: 15,
            ...Platform.select({
                android: {
                    marginBottom: -5,
                },
            }),
        };

        const title = (
            <View style={styles.searchContainer}>
                <SearchBar
                    ref='search_bar'
                    placeholder={intl.formatMessage({id: 'mobile.channel_drawer.search', defaultMessage: 'Jump to...'})}
                    cancelTitle={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    backgroundColor='transparent'
                    inputHeight={34}
                    inputStyle={searchBarInput}
                    placeholderTextColor={changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                    tintColorSearch={changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                    tintColorDelete={changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                    titleCancelColor={theme.sidebarHeaderTextColor}
                    selectionColor={changeOpacity(theme.sidebarHeaderTextColor, 0.5)}
                    onSearchButtonPress={this.onSearch}
                    onCancelButtonPress={this.cancelSearch}
                    onChangeText={this.onSearch}
                    onFocus={this.onSearchFocused}
                    value={term}
                />
            </View>
        );

        return (
            <View
                style={styles.container}
            >
                <View style={styles.statusBar}>
                    <View style={styles.headerContainer}>
                        <View style={styles.switchContainer}>
                            <SwitchTeamsButton
                                searching={searching}
                                onShowTeams={onShowTeams}
                            />
                        </View>
                        {title}
                    </View>
                </View>
                {list}
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
            paddingLeft: 10,
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
            fontWeight: 'normal',
            paddingLeft: 16,
        },
        switchContainer: {
            position: 'relative',
            top: -1,
        },
        titleContainer: { // These aren't used by this component, but they are passed down to the list component
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: 48,
            marginLeft: 16,
        },
        title: {
            flex: 1,
            color: theme.sidebarText,
            opacity: 1,
            fontSize: 15,
            fontWeight: '400',
            letterSpacing: 0.8,
            lineHeight: 18,
        },
        searchContainer: {
            flex: 1,
            paddingRight: 10,
            ...Platform.select({
                android: {
                    marginBottom: 1,
                },
                ios: {
                    marginBottom: 3,
                },
            }),
        },
        divider: {
            backgroundColor: changeOpacity(theme.sidebarText, 0.1),
            height: 1,
        },
        actionContainer: {
            alignItems: 'center',
            height: 48,
            justifyContent: 'center',
            width: 50,
        },
        action: {
            color: theme.sidebarText,
            fontSize: 20,
            fontWeight: '500',
            lineHeight: 18,
        },
        above: {
            backgroundColor: theme.mentionBj,
            top: 9,
        },
    };
});

export default injectIntl(ChannelsList);

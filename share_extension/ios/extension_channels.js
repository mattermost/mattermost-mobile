// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ActivityIndicator,
    Text,
    View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {intlShape} from 'react-intl';
import TableView from 'react-native-tableview';
import Icon from 'react-native-vector-icons/FontAwesome';

import {General} from 'mattermost-redux/constants';
import {getChannelsInTeam, getDirectChannels} from 'mattermost-redux/selectors/entities/channels';

import SearchBar from 'app/components/search_bar';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ExtensionNavBar from './extension_nav_bar';

export default class ExtensionChannels extends PureComponent {
    static propTypes = {
        entities: PropTypes.object,
        currentChannelId: PropTypes.string.isRequired,
        navigator: PropTypes.object.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        teamId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        title: PropTypes.string.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    state = {
        sections: null,
    };

    componentWillMount() {
        this.loadChannels();
    }

    buildSections = (term) => {
        const {channels} = this.state;
        const sections = [];
        const publicChannels = [];
        const privateChannels = [];
        const directChannels = [];

        channels.forEach((channel) => {
            const include = term ? channel.display_name.toLowerCase().includes(term.toLowerCase()) : true;
            if (channel.display_name && include) {
                switch (channel.type) {
                case General.OPEN_CHANNEL:
                    publicChannels.push(channel);
                    break;
                case General.PRIVATE_CHANNEL:
                    privateChannels.push(channel);
                    break;
                default:
                    directChannels.push(channel);
                    break;
                }
            }
        });

        if (publicChannels.length) {
            sections.push({
                id: 'sidebar.channels',
                defaultMessage: 'PUBLIC CHANNELS',
                data: publicChannels.sort(this.sortDisplayName),
            });
        }

        if (privateChannels.length) {
            sections.push({
                id: 'sidebar.pg',
                defaultMessage: 'PRIVATE CHANNELS',
                data: privateChannels.sort(this.sortDisplayName),
            });
        }

        if (directChannels.length) {
            sections.push({
                id: 'sidebar.direct',
                defaultMessage: 'DIRECT MESSAGES',
                data: directChannels.sort(this.sortDisplayName),
            });
        }

        this.setState({sections});
    };

    cancelSearch = () => {
        this.setState({term: ''});
        this.buildSections();
    };

    goBack = () => {
        this.props.navigator.pop();
    };

    loadChannels = async () => {
        try {
            const {entities, teamId} = this.props;

            // get the channels for the specified team
            const channelsInTeam = getChannelsInTeam({entities});
            const channelIds = channelsInTeam[teamId] || [];
            const direct = getDirectChannels({entities});
            const channels = channelIds.map((id) => this.props.entities.channels.channels[id]).concat(direct);

            const icons = await Promise.all([
                Icon.getImageSource('globe', 16, this.props.theme.centerChannelColor),
                Icon.getImageSource('lock', 16, this.props.theme.centerChannelColor),
                Icon.getImageSource('user', 16, this.props.theme.centerChannelColor),
                Icon.getImageSource('users', 16, this.props.theme.centerChannelColor),
            ]);

            this.publicChannelIcon = icons[0];
            this.privateChannelIcon = icons[1];
            this.dmChannelIcon = icons[2];
            this.gmChannelIcon = icons[3];

            this.setState({
                channels,
            }, () => {
                this.buildSections();
            });
        } catch (error) {
            this.setState({error});
        }
    };

    handleSearch = (term) => {
        this.setState({term}, () => {
            if (this.throttleTimeout) {
                clearTimeout(this.throttleTimeout);
            }

            this.throttleTimeout = setTimeout(() => {
                this.buildSections(term);
            }, 300);
        });
    };

    handleSelectChannel = (selected) => {
        const {sections} = this.state;
        const section = sections.find((s) => s.id === selected.detail);
        if (section) {
            const channel = section.data.find((c) => c.id === selected.value);
            if (channel) {
                this.props.onSelectChannel(channel);
                this.goBack();
            }
        }
    };

    renderBody = (styles) => {
        const {theme} = this.props;
        const {error, sections} = this.state;

        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.error}>
                        {error.message}
                    </Text>
                </View>
            );
        }

        if (!sections) {
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
                <TableView.Header>
                    <TableView.Cell>{this.renderSearchBar(styles)}</TableView.Cell>
                </TableView.Header>
                {this.renderSections()}
            </TableView>
        );
    };

    renderSearchBar = (styles) => {
        const {formatMessage} = this.context.intl;
        const {theme} = this.props;

        return (
            <View style={styles.searchContainer}>
                <SearchBar
                    ref='search_bar'
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    cancelTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    backgroundColor='transparent'
                    inputHeight={33}
                    inputStyle={styles.searchBarInput}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    tintColorSearch={changeOpacity(theme.centerChannelColor, 0.5)}
                    tintColorDelete={changeOpacity(theme.centerChannelColor, 0.3)}
                    titleCancelColor={theme.linkColor}
                    onChangeText={this.handleSearch}
                    onCancelButtonPress={this.cancelSearch}
                    value={this.state.term}
                />
            </View>
        );
    };

    renderSections = () => {
        const {formatMessage} = this.context.intl;
        const {currentChannelId} = this.props;
        const {sections} = this.state;

        return sections.map((s) => {
            const items = s.data.map((c) => {
                let icon;
                switch (c.type) {
                case General.OPEN_CHANNEL:
                    icon = this.publicChannelIcon.uri;
                    break;
                case General.PRIVATE_CHANNEL:
                    icon = this.privateChannelIcon.uri;
                    break;
                case General.DM_CHANNEL:
                    icon = this.dmChannelIcon.uri;
                    break;
                case General.GM_CHANNEL:
                    icon = this.gmChannelIcon.uri;
                    break;
                }

                return (
                    <TableView.Item
                        key={c.id}
                        value={c.id}
                        detail={s.id}
                        selected={c.id === currentChannelId}
                        onPress={this.handleSelectChannel}
                        image={icon}
                    >
                        {c.display_name}
                    </TableView.Item>
                );
            });

            return (
                <TableView.Section
                    key={s.id}
                    label={formatMessage({id: s.id, defaultMessage: s.defaultMessage})}
                    headerHeight={30}
                >
                    {items}
                </TableView.Section>
            );
        });
    };

    sortDisplayName = (a, b) => {
        const locale = DeviceInfo.getDeviceLocale().split('-')[0];
        return a.display_name.localeCompare(b.display_name, locale, {numeric: true});
    };

    render() {
        const {theme, title} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <View style={styles.flex}>
                <ExtensionNavBar
                    backButton={true}
                    onLeftButtonPress={this.goBack}
                    title={title}
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
            paddingLeft: 35,
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
            paddingHorizontal: 5,
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

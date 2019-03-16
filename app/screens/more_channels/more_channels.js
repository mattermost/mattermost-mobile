// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {Platform, View} from 'react-native';

import {debounce} from 'mattermost-redux/actions/helpers';
import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import CustomList from 'app/components/custom_list';
import ChannelListRow from 'app/components/custom_list/channel_list_row';
import FormattedText from 'app/components/formatted_text';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import Loading from 'app/components/loading';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {alertErrorWithFallback} from 'app/utils/general';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

export default class MoreChannels extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleSelectChannel: PropTypes.func.isRequired,
            joinChannel: PropTypes.func.isRequired,
            getChannels: PropTypes.func.isRequired,
            searchChannels: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
        }).isRequired,
        canCreateChannels: PropTypes.bool.isRequired,
        channels: PropTypes.array,
        closeButton: PropTypes.object,
        currentUserId: PropTypes.string.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props, context) {
        super(props, context);

        this.searchTimeoutId = 0;
        this.page = -1;
        this.next = true;

        this.state = {
            channels: props.channels.slice(0, General.CHANNELS_CHUNK_SIZE),
            loading: false,
            adding: false,
            term: '',
        };

        this.rightButton = {
            id: 'create-pub-channel',
            title: context.intl.formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'}),
            showAsAction: 'always',
        };

        this.leftButton = {
            id: 'close-more-channels',
            icon: props.closeButton,
        };

        const buttons = {
            leftButtons: [this.leftButton],
        };

        if (props.canCreateChannels) {
            buttons.rightButtons = [this.rightButton];
        }

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons(buttons);
    }

    componentDidMount() {
        this.doGetChannels();
    }

    componentWillReceiveProps(nextProps) {
        const {term} = this.state;
        let channels;

        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }

        if (nextProps.channels !== this.props.channels) {
            channels = nextProps.channels;
            if (term) {
                channels = this.filterChannels(nextProps.channels, term);
            }
        }

        if (channels) {
            this.setState({channels});
        }
    }

    cancelSearch = () => {
        const {channels} = this.props;

        this.setState({
            channels,
            term: '',
        });
    };

    close = () => {
        this.props.navigator.dismissModal({animationType: 'slide-down'});
    };

    doGetChannels = () => {
        const {actions, currentTeamId} = this.props;
        const {loading, term} = this.state;

        if (this.next && !loading && !term) {
            this.setState({loading: true}, () => {
                actions.getChannels(
                    currentTeamId,
                    this.page + 1,
                    General.CHANNELS_CHUNK_SIZE
                ).then(this.loadedChannels);
            });
        }
    };

    filterChannels = (channels, term) => {
        const lowerCasedTerm = term.toLowerCase();
        return channels.filter((c) => {
            return (c.name.toLowerCase().includes(lowerCasedTerm) || c.display_name.toLowerCase().includes(lowerCasedTerm));
        });
    };

    getChannels = debounce(this.doGetChannels, 100);

    headerButtons = (createEnabled) => {
        const {canCreateChannels} = this.props;
        const buttons = {
            leftButtons: [this.leftButton],
        };

        if (canCreateChannels) {
            buttons.rightButtons = [{...this.rightButton, disabled: !createEnabled}];
        }

        this.props.navigator.setButtons(buttons);
    };

    loadedChannels = ({data}) => {
        if (data && !data.length) {
            this.next = false;
        }

        this.page += 1;
        this.setState({loading: false});
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            switch (event.id) {
            case 'close-more-channels':
                this.close();
                break;
            case 'create-pub-channel':
                this.onCreateChannel();
                break;
            }
        }
    };

    onSelectChannel = async (id) => {
        const {intl} = this.context;
        const {actions, currentTeamId, currentUserId} = this.props;
        const {channels} = this.state;

        this.headerButtons(false);
        this.setState({adding: true});

        const channel = channels.find((c) => c.id === id);
        const result = await actions.joinChannel(currentUserId, currentTeamId, id);

        if (result.error) {
            alertErrorWithFallback(
                intl,
                result.error,
                {
                    id: 'mobile.join_channel.error',
                    defaultMessage: "We couldn't join the channel {displayName}. Please check your connection and try again.",
                },
                {
                    displayName: channel ? channel.display_name : '',
                }
            );
            this.headerButtons(true);
            this.setState({adding: false});
        } else {
            if (channel) {
                actions.setChannelDisplayName(channel.display_name);
            } else {
                actions.setChannelDisplayName('');
            }
            await actions.handleSelectChannel(id);

            EventEmitter.emit('close_channel_drawer');
            requestAnimationFrame(() => {
                this.close();
            });
        }
    };

    onCreateChannel = () => {
        const {formatMessage} = this.context.intl;
        const {navigator, theme} = this.props;

        navigator.push({
            screen: 'CreateChannel',
            animationType: 'slide-up',
            title: formatMessage({id: 'mobile.create_channel.public', defaultMessage: 'New Public Channel'}),
            backButtonTitle: '',
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            passProps: {
                channelType: General.OPEN_CHANNEL,
            },
        });
    };

    renderLoading = () => {
        const {theme, channels} = this.props;
        const style = getStyleFromTheme(theme);

        if (!channels.length && this.page <= 0) {
            return null;
        }

        return (
            <View style={style.loadingContainer}>
                <FormattedText
                    id='mobile.loading_channels'
                    defaultMessage='Loading Channels...'
                    style={style.loadingText}
                />
            </View>
        );
    };

    renderNoResults = () => {
        const {term, loading} = this.state;
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);

        if (loading) {
            return null;
        }

        if (term) {
            return (
                <View style={style.noResultContainer}>
                    <FormattedText
                        id='mobile.custom_list.no_results'
                        defaultMessage='No Results'
                        style={style.noResultText}
                    />
                </View>
            );
        }

        return (
            <View style={style.noResultContainer}>
                <FormattedText
                    id='more_channels.noMore'
                    defaultMessage='No more channels to join'
                    style={style.noResultText}
                />
            </View>
        );
    };

    searchChannels = (text) => {
        const {actions, channels, currentTeamId} = this.props;

        if (text) {
            const filtered = this.filterChannels(channels, text);
            this.setState({
                channels: filtered,
                term: text,
            });
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                actions.searchChannels(currentTeamId, text.toLowerCase());
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.cancelSearch();
        }
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {theme} = this.props;
        const {adding, channels, loading, term} = this.state;
        const more = term ? () => true : this.getChannels;
        const style = getStyleFromTheme(theme);

        let content;
        if (adding) {
            content = (<Loading/>);
        } else {
            const searchBarInput = {
                backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
                color: theme.centerChannelColor,
                fontSize: 15,
                ...Platform.select({
                    android: {
                        marginBottom: -5,
                    },
                }),
            };

            content = (
                <React.Fragment>
                    <View style={style.searchBar}>
                        <SearchBar
                            ref='search_bar'
                            placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                            cancelTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                            backgroundColor='transparent'
                            inputHeight={33}
                            inputStyle={searchBarInput}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                            tintColorSearch={changeOpacity(theme.centerChannelColor, 0.5)}
                            tintColorDelete={changeOpacity(theme.centerChannelColor, 0.5)}
                            titleCancelColor={theme.centerChannelColor}
                            onChangeText={this.searchChannels}
                            onSearchButtonPress={this.searchChannels}
                            onCancelButtonPress={this.cancelSearch}
                            autoCapitalize='none'
                            value={term}
                        />
                    </View>
                    <CustomList
                        data={channels}
                        extraData={loading}
                        key='custom_list'
                        loading={loading}
                        loadingComponent={this.renderLoading()}
                        noResults={this.renderNoResults()}
                        onLoadMore={more}
                        onRowPress={this.onSelectChannel}
                        renderItem={ChannelListRow}
                        theme={theme}
                    />
                </React.Fragment>
            );
        }

        return (
            <KeyboardLayout>
                <StatusBar/>
                {content}
            </KeyboardLayout>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        searchBar: {
            marginVertical: 5,
        },
        loadingContainer: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            height: 70,
            justifyContent: 'center',
        },
        loadingText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
        },
        noResultContainer: {
            flexGrow: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        noResultText: {
            fontSize: 26,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

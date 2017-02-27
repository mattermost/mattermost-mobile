// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {
    InteractionManager,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import ChannelList from 'app/components/custom_list';
import ChannelListRow from 'app/components/custom_list/channel_list_row';
import SearchBar from 'app/components/search_bar';

import {Constants, RequestStatus} from 'service/constants';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

import CreateButton from './create_button';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        }
    });
});

class MoreChannels extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        currentUserId: PropTypes.string.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        channels: PropTypes.array,
        requestStatus: PropTypes.object.isRequired,
        subscribeToHeaderEvent: React.PropTypes.func.isRequired,
        unsubscribeFromHeaderEvent: React.PropTypes.func.isRequired,
        actions: PropTypes.shape({
            goBack: PropTypes.func.isRequired,
            handleSelectChannel: PropTypes.func.isRequired,
            goToCreateChannel: PropTypes.func.isRequired,
            joinChannel: PropTypes.func.isRequired,
            getMoreChannels: PropTypes.func.isRequired,
            searchMoreChannels: PropTypes.func.isRequired
        }).isRequired
    };

    static navigationProps = {
        renderLeftComponent: (props, emitter, theme) => {
            return (
                <TouchableOpacity
                    style={{flex: 1, paddingHorizontal: 15, justifyContent: 'center'}}
                    onPress={() => emitter('close')}
                >
                    <FormattedText
                        id='more_direct_channels.close'
                        defaultMessage='Close'
                        style={{color: theme.sidebarHeaderTextColor}}
                    />
                </TouchableOpacity>
            );
        },
        renderRightComponent: (props, emitter) => {
            return <CreateButton emitter={emitter}/>;
        }
    };

    constructor(props) {
        super(props);

        this.searchTimeoutId = 0;

        this.state = {
            channels: [],
            page: 0,
            next: true,
            searching: false
        };
    }

    componentWillMount() {
        this.props.subscribeToHeaderEvent('close', this.props.actions.goBack);
        this.props.subscribeToHeaderEvent('new_channel', this.onCreateChannel);
    }

    componentWillReceiveProps(nextProps) {
        const {requestStatus} = this.props;
        if (this.state.searching &&
            nextProps.requestStatus.status === RequestStatus.SUCCESS) {
            const channels = this.filterChannels(nextProps.channels, this.state.term);
            this.setState({channels});
        } else if (requestStatus.status === RequestStatus.STARTED &&
            nextProps.requestStatus.status === RequestStatus.SUCCESS) {
            const {page} = this.state;
            const channels = nextProps.channels.splice(0, (page + 1) * Constants.CHANNELS_CHUNK_SIZE);
            this.setState({channels});
        }
    }

    componentDidMount() {
        InteractionManager.runAfterInteractions(() => {
            this.props.actions.getMoreChannels(this.props.currentTeamId, 0);
        });
    }

    componentWillUnmount() {
        this.props.unsubscribeFromHeaderEvent('close');
        this.props.unsubscribeFromHeaderEvent('new_channel');
    }

    filterChannels = (channels, term) => {
        return channels.filter((c) => {
            return (c.name.toLowerCase().indexOf(term) !== -1 || c.display_name.toLowerCase().indexOf(term) !== -1);
        });
    };

    searchBarRef = (ref) => {
        this.searchBar = ref;
    };

    onSearchButtonPress = () => {
        this.searchBar.blur();
    };

    searchProfiles = (event) => {
        const term = event.nativeEvent.text.toLowerCase();

        if (term) {
            const channels = this.filterChannels(this.state.channels, term);
            this.setState({channels, term, searching: true});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                this.props.actions.searchMoreChannels(this.props.currentTeamId, term);
            }, Constants.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.cancelSearch();
        }
    };

    cancelSearch = () => {
        this.props.actions.getMoreChannels(this.props.currentTeamId, 0);
        this.setState({
            term: null,
            searching: false,
            page: 0
        });
    };

    loadMoreChannels = () => {
        let {page} = this.state;
        if (this.props.requestStatus.status !== RequestStatus.STARTED && this.state.next && !this.state.searching) {
            page = page + 1;
            this.props.actions.getMoreChannels(
                this.props.currentTeamId,
                page * Constants.CHANNELS_CHUNK_SIZE,
                Constants.CHANNELS_CHUNK_SIZE).
            then((data) => {
                if (Object.keys(data).length) {
                    this.setState({
                        page
                    });
                } else {
                    this.setState({next: false});
                }
            });
        }
    };

    renderChannelRow = (channel, sectionId, rowId, preferences, theme, selectable, onPress, onSelect) => {
        const {id, display_name: displayName, purpose} = channel;
        let onRowSelect = null;
        if (selectable) {
            onRowSelect = () => onSelect(sectionId, rowId);
        }

        return (
            <ChannelListRow
                id={id}
                displayName={displayName}
                purpose={purpose}
                theme={theme}
                onPress={onPress}
                selectable={selectable}
                selected={channel.selected}
                onRowSelect={onRowSelect}
            />
        );
    };

    onSelectChannel = async (id) => {
        this.searchBar.blur();
        await this.props.actions.joinChannel(
            this.props.currentUserId,
            this.props.currentTeamId,
            id);
        await this.props.actions.handleSelectChannel(id);

        InteractionManager.runAfterInteractions(() => {
            this.props.actions.goBack();
        });
    };

    onCreateChannel = async () => {
        this.props.actions.goToCreateChannel(Constants.OPEN_CHANNEL);
    };

    render() {
        const {formatMessage} = this.props.intl;
        const isLoading = this.props.requestStatus.status === RequestStatus.STARTED;
        const style = getStyleFromTheme(this.props.theme);
        const more = this.state.searching ? () => true : this.loadMoreChannels;

        return (
            <View style={style.container}>
                <View
                    style={{marginVertical: 5}}
                >
                    <SearchBar
                        ref={this.searchBarRef}
                        placeholder={formatMessage({id: 'search_bar.search', defaultMesage: 'Search'})}
                        height={27}
                        fontSize={14}
                        textColor={this.props.theme.centerChannelColor}
                        hideBackground={true}
                        textFieldBackgroundColor={changeOpacity(this.props.theme.centerChannelColor, 0.07)}
                        onChange={this.searchProfiles}
                        onSearchButtonPress={this.onSearchButtonPress}
                        onCancelButtonPress={this.cancelSearch}
                    />
                </View>
                <ChannelList
                    data={this.state.channels}
                    theme={this.props.theme}
                    searching={this.state.searching}
                    onListEndReached={more}
                    loading={isLoading}
                    selectable={false}
                    listScrollRenderAheadDistance={50}
                    showSections={false}
                    renderRow={this.renderChannelRow}
                    onRowPress={this.onSelectChannel}
                    loadingText={{id: 'mobile.loading_channels', defaultMessage: 'Loading Channels...'}}
                />
            </View>
        );
    }
}

export default injectIntl(MoreChannels);

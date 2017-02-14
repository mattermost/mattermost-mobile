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
import MemberList from 'app/components/member_list';
import SearchBar from 'app/components/search_bar';

import {Constants, RequestStatus} from 'service/constants';
import {changeOpacity} from 'app/utils/theme';

const style = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    }
});

class MoreDirectMessages extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        preferences: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        profiles: PropTypes.array,
        search: PropTypes.array,
        requestStatus: PropTypes.object.isRequired,
        searchRequest: PropTypes.object.isRequired,
        subscribeToHeaderEvent: React.PropTypes.func.isRequired,
        unsubscribeFromHeaderEvent: React.PropTypes.func.isRequired,
        actions: PropTypes.shape({
            goBack: PropTypes.func.isRequired,
            makeDirectChannel: PropTypes.func.isRequired,
            getProfiles: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired
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
        }
    };

    constructor(props) {
        super(props);

        this.searchTimeoutId = 0;

        this.state = {
            profiles: [],
            page: 0,
            next: true,
            searching: false
        };
    }

    componentWillMount() {
        this.props.subscribeToHeaderEvent('close', this.props.actions.goBack);
    }

    componentWillReceiveProps(nextProps) {
        const {requestStatus} = this.props;
        if (requestStatus.status === RequestStatus.STARTED &&
            nextProps.requestStatus.status === RequestStatus.SUCCESS) {
            const {page} = this.state;
            const profiles = nextProps.profiles.splice(0, (page + 1) * Constants.PROFILE_CHUNK_SIZE);
            this.setState({profiles});
        } else if (this.state.searching &&
            nextProps.searchRequest.status === RequestStatus.SUCCESS) {
            this.setState({profiles: nextProps.search});
        }
    }

    componentDidMount() {
        InteractionManager.runAfterInteractions(() => {
            this.props.actions.getProfiles(0);
        });
    }

    componentWillUnmount() {
        this.props.unsubscribeFromHeaderEvent('close');
    }

    searchProfiles = (event) => {
        const term = event.nativeEvent.text;

        if (term) {
            this.setState({searching: true});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                this.props.actions.searchProfiles(term);
            }, Constants.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.cancelSearch();
        }
    };

    cancelSearch = () => {
        this.setState({
            searching: false,
            page: 0,
            profiles: []
        });
    };

    loadMoreProfiles = () => {
        let {page} = this.state;
        if (this.props.requestStatus.status !== RequestStatus.STARTED && this.state.next && !this.state.searching) {
            page = page + 1;
            this.props.actions.getProfiles(page, Constants.PROFILE_CHUNK_SIZE).
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

    onSelectMember = (id) => {
        this.searchBar.blur();
        this.props.actions.makeDirectChannel(id).
        then(() => {
            InteractionManager.runAfterInteractions(() => {
                this.props.actions.goBack();
            });
        });
    };

    render() {
        const {formatMessage} = this.props.intl;
        const isLoading = (this.props.requestStatus.status === RequestStatus.STARTED) ||
            (this.props.searchRequest.status === RequestStatus.STARTED);

        const more = this.state.searching ? () => true : this.loadMoreProfiles;

        return (
            <View style={style.container}>
                <View
                    style={{marginVertical: 5}}
                >
                    <SearchBar
                        ref={(ref) => {
                            this.searchBar = ref;
                        }}
                        placeholder={formatMessage({id: 'search_bar.search', defaultMesage: 'Search'})}
                        height={27}
                        fontSize={14}
                        hideBackground={true}
                        textFieldBackgroundColor={changeOpacity(this.props.theme.centerChannelColor, 0.4)}
                        onChange={this.searchProfiles}
                        onSearchButtonPress={() => {
                            this.searchBar.blur();
                        }}
                        onCancelButtonPress={this.cancelSearch}
                    />
                </View>
                <MemberList
                    members={this.state.profiles}
                    searching={this.state.searching}
                    onListEndReached={more}
                    preferences={this.props.preferences}
                    loadingMembers={isLoading}
                    selectable={false}
                    listScrollRenderAheadDistance={50}
                    onRowPress={this.onSelectMember}
                />
            </View>
        );
    }
}

export default injectIntl(MoreDirectMessages);

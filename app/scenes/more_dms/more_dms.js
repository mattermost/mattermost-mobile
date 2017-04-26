// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {
    Keyboard,
    Platform,
    InteractionManager,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import Loading from 'app/components/loading';
import MemberList from 'app/components/custom_list';
import SearchBar from 'app/components/search_bar';
import {createMembersSections, loadingText, renderMemberRow} from 'app/utils/member_list';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

import {General, RequestStatus} from 'mattermost-redux/constants';
import {filterProfilesMatchingTerm} from 'mattermost-redux/utils/user_utils';

class MoreDirectMessages extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        preferences: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        profiles: PropTypes.array,
        requestStatus: PropTypes.object.isRequired,
        searchRequest: PropTypes.object.isRequired,
        subscribeToHeaderEvent: React.PropTypes.func.isRequired,
        unsubscribeFromHeaderEvent: React.PropTypes.func.isRequired,
        actions: PropTypes.shape({
            closeDrawers: PropTypes.func.isRequired,
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
            profiles: props.profiles.splice(0, General.PROFILE_CHUNK_SIZE),
            page: 0,
            adding: false,
            next: true,
            searching: false,
            showNoResults: false
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
            const profiles = nextProps.profiles.splice(0, (page + 1) * General.PROFILE_CHUNK_SIZE);
            this.setState({profiles, showNoResults: true});
        } else if (this.state.searching &&
            nextProps.searchRequest.status === RequestStatus.SUCCESS) {
            const results = filterProfilesMatchingTerm(nextProps.profiles, this.state.term);
            this.setState({profiles: results, showNoResults: true});
        }
    }

    componentDidMount() {
        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
        }

        // set the timeout to 400 cause is the time that the modal takes to open
        // Somehow interactionManager doesn't care
        setTimeout(() => {
            this.props.actions.getProfiles(0);
        }, 400);
    }

    componentWillUnmount() {
        this.props.unsubscribeFromHeaderEvent('close');

        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    handleAndroidKeyboard = () => {
        this.onSearchButtonPress();
    };

    searchBarRef = (ref) => {
        this.searchBar = ref;
    };

    onSearchButtonPress = () => {
        this.searchBar.blur();
    };

    searchProfiles = (event) => {
        const term = event.nativeEvent.text;

        if (term) {
            this.setState({searching: true, term: term.toLowerCase()});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                this.props.actions.searchProfiles(term);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.cancelSearch();
        }
    };

    cancelSearch = () => {
        this.setState({
            searching: false,
            term: null,
            page: 0,
            profiles: this.props.profiles
        });
    };

    loadMoreProfiles = () => {
        let {page} = this.state;
        if (this.props.requestStatus.status !== RequestStatus.STARTED && this.state.next && !this.state.searching) {
            page = page + 1;
            this.props.actions.getProfiles(page, General.PROFILE_CHUNK_SIZE).
            then((data) => {
                if (data && data.length) {
                    this.setState({
                        page
                    });
                } else {
                    this.setState({next: false});
                }
            });
        }
    };

    onSelectMember = async (id) => {
        this.setState({adding: true});
        this.searchBar.blur();
        await this.props.actions.makeDirectChannel(id);

        this.props.actions.closeDrawers();
        InteractionManager.runAfterInteractions(() => {
            this.props.actions.goBack();
        });
    };

    render() {
        const {intl, preferences, requestStatus, searchRequest, theme} = this.props;
        const {adding, profiles, searching, showNoResults} = this.state;
        const {formatMessage} = intl;
        const isLoading = (requestStatus.status === RequestStatus.STARTED) || (requestStatus.status === RequestStatus.NOT_STARTED) ||
            (searchRequest.status === RequestStatus.STARTED);
        const style = getStyleFromTheme(theme);
        const more = this.state.searching ? () => true : this.loadMoreProfiles;

        let content;
        if (adding) {
            content = (
                <View style={style.container}>
                    <Loading/>
                </View>
            );
        } else {
            content = (
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
                    <MemberList
                        data={profiles}
                        theme={theme}
                        searching={searching}
                        onListEndReached={more}
                        preferences={preferences}
                        loading={isLoading}
                        selectable={false}
                        listScrollRenderAheadDistance={50}
                        createSections={createMembersSections}
                        renderRow={renderMemberRow}
                        onRowPress={this.onSelectMember}
                        loadingText={loadingText}
                        showNoResults={showNoResults}
                    />
                </View>
            );
        }

        return content;
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        }
    });
});

export default injectIntl(MoreDirectMessages);

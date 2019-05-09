// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform} from 'react-native';
import {intlShape} from 'react-intl';

import {General, RequestStatus} from 'mattermost-redux/constants';
import {getLastPostIndex} from 'mattermost-redux/utils/post_list';

import {THREAD} from 'app/constants/screen';

import Loading from 'app/components/loading';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import PostList from 'app/components/post_list';
import PostTextbox from 'app/components/post_textbox';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';
import {makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';
import DeletedPost from 'app/components/deleted_post';

export default class Thread extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            selectPost: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        channelType: PropTypes.string,
        displayName: PropTypes.string,
        navigator: PropTypes.object,
        myMember: PropTypes.object.isRequired,
        rootId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        postIds: PropTypes.array.isRequired,
        channelIsArchived: PropTypes.bool,
        threadLoadingStatus: PropTypes.object,
    };

    state = {};

    static contextTypes = {
        intl: intlShape,
    };

    componentWillMount() {
        const {channelType, displayName} = this.props;
        const {intl} = this.context;
        let title;

        if (channelType === General.DM_CHANNEL) {
            title = intl.formatMessage({id: 'mobile.routes.thread_dm', defaultMessage: 'Direct Message Thread'});
        } else {
            title = intl.formatMessage({id: 'mobile.routes.thread', defaultMessage: '{channelName} Thread'}, {channelName: displayName});
        }

        this.props.navigator.setTitle({
            title,
        });
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }

        if (this.props.postIds !== nextProps.postIds && !nextProps.postIds.length) {
            this.close();
            return;
        }

        if (!this.state.lastViewedAt) {
            this.setState({lastViewedAt: nextProps.myMember && nextProps.myMember.last_viewed_at});
        }
    }

    componentWillUnmount() {
        this.props.actions.selectPost('');
    }

    close = () => {
        const {navigator} = this.props;

        if (Platform.OS === 'ios') {
            navigator.pop({
                animated: true,
            });
        } else {
            navigator.dismissModal({
                animationType: 'slide-down',
            });
        }
    };

    hasRootPost = () => {
        return this.props.postIds.includes(this.props.rootId);
    };

    renderFooter = () => {
        if (!this.hasRootPost() && this.props.threadLoadingStatus.status !== RequestStatus.STARTED) {
            return (
                <DeletedPost theme={this.props.theme}/>
            );
        } else if (this.props.threadLoadingStatus.status === RequestStatus.STARTED) {
            return (
                <Loading/>
            );
        }

        return null;
    };

    onCloseChannel = () => {
        this.props.navigator.resetTo({
            screen: 'Channel',
            title: '',
            animated: false,
            backButtonTitle: '',
            navigatorStyle: {
                animated: true,
                animationType: 'fade',
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
            },
            passProps: {
                disableTermsModal: true,
            },
        });
    };

    render() {
        const {
            channelId,
            myMember,
            navigator,
            postIds,
            rootId,
            theme,
            channelIsArchived,
        } = this.props;
        const style = getStyle(theme);
        let content;
        let postTextBox;
        if (this.hasRootPost()) {
            content = (
                <PostList
                    renderFooter={this.renderFooter()}
                    indicateNewMessages={false}
                    postIds={postIds}
                    lastPostIndex={Platform.OS === 'android' ? getLastPostIndex(postIds) : -1}
                    currentUserId={myMember && myMember.user_id}
                    lastViewedAt={this.state.lastViewedAt}
                    navigator={navigator}
                    location={THREAD}
                />
            );

            postTextBox = (
                <PostTextbox
                    channelIsArchived={channelIsArchived}
                    rootId={rootId}
                    channelId={channelId}
                    navigator={navigator}
                    onCloseChannel={this.onCloseChannel}
                />
            );
        } else {
            content = (
                <Loading/>
            );
        }

        return (
            <SafeAreaView
                excludeHeader={true}
                keyboardOffset={20}
            >
                <StatusBar/>
                <KeyboardLayout style={style.container}>
                    {content}
                    {postTextBox}
                </KeyboardLayout>
            </SafeAreaView>
        );
    }
}

const getStyle = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
    };
});

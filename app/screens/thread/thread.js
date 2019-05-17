// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Keyboard, Platform} from 'react-native';
import {intlShape} from 'react-intl';
import {KeyboardTrackingView} from 'react-native-keyboard-tracking-view';

import {General, RequestStatus} from 'mattermost-redux/constants';
import {getLastPostIndex} from 'mattermost-redux/utils/post_list';

import {THREAD} from 'app/constants/screen';

import Autocomplete, {AUTOCOMPLETE_MAX_HEIGHT} from 'app/components/autocomplete';
import FileUploadPreview from 'app/components/file_upload_preview';
import Loading from 'app/components/loading';
import PostList from 'app/components/post_list';
import PostTextbox from 'app/components/post_textbox';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';
import {setNavigatorStyles} from 'app/utils/theme';
import DeletedPost from 'app/components/deleted_post';

const THREAD_POST_TEXTBOX_CURSOR_CHANGE = 'onThreadTextBoxCursorChange';
const THREAD_POST_TEXTBOX_VALUE_CHANGE = 'onThreadTextBoxValueChange';
const SCROLLVIEW_NATIVE_ID = 'threadPostList';

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

    static defaultProps = {
        postIds: [],
    };

    state = {};

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props, context) {
        super(props);

        const {channelType, displayName} = props;
        const {formatMessage} = context.intl;
        let title;

        if (channelType === General.DM_CHANNEL) {
            title = formatMessage({id: 'mobile.routes.thread_dm', defaultMessage: 'Direct Message Thread'});
        } else {
            title = formatMessage({id: 'mobile.routes.thread', defaultMessage: '{channelName} Thread'}, {channelName: displayName});
        }

        this.postTextbox = React.createRef();

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

    handleAutoComplete = (value) => {
        if (this.postTextbox?.current) {
            this.postTextbox.current.handleTextChange(value, true);
        }
    };

    hasRootPost = () => {
        return this.props.postIds.includes(this.props.rootId);
    };

    hideKeyboard = () => {
        Keyboard.dismiss();
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
            channelIsArchived,
        } = this.props;

        let content;
        let postTextBox;
        if (this.hasRootPost()) {
            content = (
                <React.Fragment>
                    <PostList
                        renderFooter={this.renderFooter()}
                        indicateNewMessages={false}
                        postIds={postIds}
                        lastPostIndex={Platform.OS === 'android' ? getLastPostIndex(postIds) : -1}
                        currentUserId={myMember && myMember.user_id}
                        lastViewedAt={this.state.lastViewedAt}
                        navigator={navigator}
                        onPostPress={this.hideKeyboard}
                        location={THREAD}
                        scrollViewNativeID={SCROLLVIEW_NATIVE_ID}
                    />
                    <FileUploadPreview
                        channelId={channelId}
                        rootId={rootId}
                    />
                    <Autocomplete
                        maxHeight={AUTOCOMPLETE_MAX_HEIGHT}
                        onChangeText={this.handleAutoComplete}
                        cursorPositionEvent={THREAD_POST_TEXTBOX_CURSOR_CHANGE}
                        valueEvent={THREAD_POST_TEXTBOX_VALUE_CHANGE}
                        rootId={rootId}
                    />
                </React.Fragment>
            );

            postTextBox = (
                <KeyboardTrackingView scrollViewNativeID={SCROLLVIEW_NATIVE_ID}>
                    <PostTextbox
                        ref={this.postTextbox}
                        channelIsArchived={channelIsArchived}
                        rootId={rootId}
                        channelId={channelId}
                        navigator={navigator}
                        onCloseChannel={this.onCloseChannel}
                        cursorPositionEvent={THREAD_POST_TEXTBOX_CURSOR_CHANGE}
                        valueEvent={THREAD_POST_TEXTBOX_VALUE_CHANGE}
                    />
                </KeyboardTrackingView>
            );
        } else {
            content = (
                <Loading/>
            );
        }

        return (
            <React.Fragment>
                <SafeAreaView
                    excludeHeader={true}
                    keyboardOffset={20}
                >
                    <StatusBar/>
                    {content}
                </SafeAreaView>
                {postTextBox}
            </React.Fragment>
        );
    }
}

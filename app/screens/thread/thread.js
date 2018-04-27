// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';

import {General} from 'mattermost-redux/constants';

import KeyboardLayout from 'app/components/layout/keyboard_layout';
import PostList from 'app/components/post_list';
import PostTextbox from 'app/components/post_textbox';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';
import {makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';
import DeletedPost from 'app/components/deleted_post';

class Thread extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            selectPost: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        channelType: PropTypes.string,
        displayName: PropTypes.string,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        myMember: PropTypes.object.isRequired,
        rootId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        postIds: PropTypes.array.isRequired,
    };

    state = {};

    componentWillMount() {
        const {channelType, displayName, intl} = this.props;
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
            this.setState({lastViewedAt: nextProps.myMember.last_viewed_at});
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
    }

    renderFooter = () => {
        if (!this.hasRootPost()) {
            return (
                <DeletedPost theme={this.props.theme}/>
            );
        }
        return null;
    }

    render() {
        const {
            channelId,
            myMember,
            navigator,
            postIds,
            rootId,
            theme,
        } = this.props;
        const style = getStyle(theme);

        return (
            <SafeAreaView
                excludeHeader={true}
                keyboardOffset={20}
            >
                <StatusBar/>
                <KeyboardLayout
                    behavior='padding'
                    style={style.container}
                    keyboardVerticalOffset={65}
                >
                    <PostList
                        renderFooter={this.renderFooter}
                        indicateNewMessages={true}
                        postIds={postIds}
                        currentUserId={myMember.user_id}
                        lastViewedAt={this.state.lastViewedAt}
                        navigator={navigator}
                    />
                    {this.hasRootPost() &&
                    <PostTextbox
                        rootId={rootId}
                        channelId={channelId}
                        navigator={navigator}
                    />}
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

export default injectIntl(Thread);

// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';

import {General} from 'mattermost-redux/constants';

import KeyboardLayout from 'app/components/layout/keyboard_layout';
import PostList from 'app/components/post_list';
import PostTextbox from 'app/components/post_textbox';
import StatusBar from 'app/components/status_bar';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

class Thread extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            selectPost: PropTypes.func.isRequired
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        channelType: PropTypes.string.isRequired,
        displayName: PropTypes.string.isRequired,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        myMember: PropTypes.object.isRequired,
        rootId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        postIds: PropTypes.array.isRequired
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
            title
        });
    }

    componentWillReceiveProps(nextProps) {
        if (!this.state.lastViewedAt) {
            this.setState({lastViewedAt: nextProps.myMember.last_viewed_at});
        }
    }

    componentWillUnmount() {
        this.props.actions.selectPost('');
    }

    render() {
        const {
            channelId,
            myMember,
            navigator,
            postIds,
            rootId,
            theme
        } = this.props;
        const style = getStyle(theme);

        return (
            <KeyboardLayout
                behavior='padding'
                style={style.container}
                keyboardVerticalOffset={65}
            >
                <StatusBar/>
                <PostList
                    indicateNewMessages={true}
                    postIds={postIds}
                    currentUserId={myMember.user_id}
                    lastViewedAt={this.state.lastViewedAt}
                    navigator={navigator}
                />
                <PostTextbox
                    rootId={rootId}
                    channelId={channelId}
                    navigator={navigator}
                />
            </KeyboardLayout>
        );
    }
}

const getStyle = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        }
    };
});

export default injectIntl(Thread);

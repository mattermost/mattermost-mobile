// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Keyboard} from 'react-native';
import {intlShape} from 'react-intl';

import {General, RequestStatus} from 'mattermost-redux/constants';

import Loading from 'app/components/loading';
import DeletedPost from 'app/components/deleted_post';
import {resetToChannel, popTopScreen, mergeNavigationOptions} from 'app/actions/navigation';
import {setNavigatorStyles} from 'app/utils/theme';

export default class ThreadBase extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            selectPost: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string,
        channelId: PropTypes.string.isRequired,
        channelType: PropTypes.string,
        displayName: PropTypes.string,
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

        const options = {
            topBar: {
                title: {
                    text: title,
                },
            },
        };
        mergeNavigationOptions(props.componentId, options);

        this.state = {
            lastViewedAt: props.myMember && props.myMember.last_viewed_at,
        };
    }

    static getDerivedStateFromProps(props, state) {
        if (props.myMember?.last_viewed_at && !state.lastViewedAt) { //eslint-disable-line camelcase
            return {
                lastViewedAt: props.myMember.last_viewed_at,
            };
        }

        return null;
    }

    componentWillUnmount() {
        this.props.actions.selectPost('');
    }

    componentDidUpdate(prevProps) {
        if (this.props.theme !== prevProps.theme) {
            setNavigatorStyles(this.props.componentId, this.props.theme);
        }

        if (this.props.postIds !== prevProps.postIds && !this.props.postIds.length) {
            this.close();
        }
    }

    close = () => {
        const {componentId} = this.props;
        popTopScreen(componentId);
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
        const {theme, threadLoadingStatus} = this.props;

        if (!this.hasRootPost() && threadLoadingStatus.status !== RequestStatus.STARTED) {
            return (
                <DeletedPost theme={theme}/>
            );
        } else if (threadLoadingStatus.status === RequestStatus.STARTED) {
            return (
                <Loading color={theme.centerChannelColor}/>
            );
        }

        return null;
    };

    onCloseChannel = () => {
        const passProps = {
            disableTermsModal: true,
        };
        resetToChannel(passProps);
    };
}

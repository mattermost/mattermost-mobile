// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Keyboard} from 'react-native';
import {intlShape} from 'react-intl';
import {Navigation} from 'react-native-navigation';

import {General, RequestStatus} from 'mattermost-redux/constants';

import Loading from 'app/components/loading';
import {setNavigatorStyles} from 'app/utils/theme';
import DeletedPost from 'app/components/deleted_post';

export default class ThreadBase extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            selectPost: PropTypes.func.isRequired,
            popTopScreen: PropTypes.func.isRequired,
            resetToChannel: PropTypes.func.isRequired,
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

        Navigation.mergeOptions(props.componentId, {
            topBar: {
                title: {
                    text: title,
                },
            },
        });

        this.state = {
            lastViewedAt: props.myMember && props.myMember.last_viewed_at,
        };
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.componentId, nextProps.theme);
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
        const {actions, componentId} = this.props;
        actions.popTopScreen(componentId);
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
        const passProps = {
            disableTermsModal: true,
        };
        this.props.actions.resetToChannel(passProps);
    };
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Keyboard, Platform} from 'react-native';
import {intlShape} from 'react-intl';

import {General, RequestStatus} from 'mattermost-redux/constants';

import Loading from 'app/components/loading';
import {setNavigatorStyles} from 'app/utils/theme';
import DeletedPost from 'app/components/deleted_post';

export default class ThreadBase extends PureComponent {
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

        this.state = {
            lastViewedAt: props.myMember && props.myMember.last_viewed_at,
        };
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
}

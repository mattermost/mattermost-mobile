// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, Keyboard} from 'react-native';
import {intlShape} from 'react-intl';
import {Navigation} from 'react-native-navigation';

import {General, RequestStatus} from '@mm-redux/constants';
import EventEmitter from '@mm-redux/utils/event_emitter';

import Loading from 'app/components/loading';
import DeletedPost from 'app/components/deleted_post';
import {popTopScreen, mergeNavigationOptions} from 'app/actions/navigation';
import {TYPING_HEIGHT, TYPING_VISIBLE} from '@constants/post_draft';

import ThreadFollow from './thread_follow';

Navigation.registerComponent('ThreadFollow', () => ThreadFollow);

export default class ThreadBase extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            selectPost: PropTypes.func.isRequired,
            setThreadFollow: PropTypes.func.isRequired,
            updateThreadRead: PropTypes.func,
        }).isRequired,
        componentId: PropTypes.string,
        channelType: PropTypes.string,
        collapsedThreadsEnabled: PropTypes.bool,
        displayName: PropTypes.string,
        myMember: PropTypes.object.isRequired,
        postIds: PropTypes.array.isRequired,
        rootId: PropTypes.string.isRequired,
        teamId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        thread: PropTypes.object,
        threadLoadingStatus: PropTypes.object,
        userId: PropTypes.string,
    };

    static defaultProps = {
        postIds: [],
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props, context) {
        super(props);

        const {channelType, displayName, theme, thread} = props;
        const {formatMessage} = context.intl;

        const options = {};

        if (channelType === General.DM_CHANNEL) {
            options.topBar = {
                title: {
                    text: formatMessage({id: 'mobile.routes.thread_dm', defaultMessage: 'Direct Message Thread'}),
                },
            };
        } else if (props.collapsedThreadsEnabled) {
            options.topBar = {
                title: {
                    text: 'Thread',
                    fontSize: 18,
                    fontWeight: '600',
                    color: theme.centerChannelColor,
                },
                subtitle: {
                    text: 'in UX Design',
                    fontSize: 13,
                    color: theme.centerChannelColor,
                },
                rightButtons: [
                    {
                        id: '1',
                        component: {
                            id: 'ThreadFollow',
                            name: 'ThreadFollow',
                            passProps: {
                                active: thread?.is_following,
                                intl: context.intl,
                                theme,
                                onPress: this.handleThreadFollow.bind(this),
                            },
                        },
                    },
                ],
            };
        } else {
            options.topBar = {
                title: {
                    text: formatMessage({id: 'mobile.routes.thread', defaultMessage: '{channelName} Thread'}, {channelName: displayName}),
                },
            };
        }

        mergeNavigationOptions(props.componentId, options);

        this.postDraft = React.createRef();

        this.state = {
            lastViewedAt: props.myMember && props.myMember.last_viewed_at,
        };

        this.bottomPadding = new Animated.Value(0);
        this.typingAnimations = [];
    }

    componentDidMount() {
        this.markThreadRead();
        this.removeTypingAnimation = this.registerTypingAnimation(this.bottomPaddingAnimation);
        EventEmitter.on(TYPING_VISIBLE, this.runTypingAnimations);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.postIds !== nextProps.postIds && !nextProps.postIds.length) {
            this.close();
            return;
        }

        if (!this.state.lastViewedAt) {
            this.setState({lastViewedAt: nextProps.myMember && nextProps.myMember.last_viewed_at});
        }

        if (this.props.thread?.id !== nextProps.thread?.id) {
            this.markThreadRead();
        }

        if (this.props.thread?.is_following !== nextProps.thread?.is_following) {
            Navigation.updateProps('ThreadFollow', {active: nextProps.thread?.is_following});
        }
    }

    componentWillUnmount() {
        this.props.actions.selectPost('');
        this.removeTypingAnimation();
        EventEmitter.off(TYPING_VISIBLE, this.runTypingAnimations);
    }

    handleThreadFollow() {
        const {userId, teamId, rootId, thread} = this.props;
        this.props.actions.setThreadFollow(userId, teamId, rootId, !thread?.is_following);
    }

    markThreadRead() {
        if (
            this.props.collapsedThreadsEnabled &&
            this.props.thread &&
            (
                this.props.thread.last_viewed_at < this.props.thread.last_reply_at ||
                this.props.thread.unread_mentions ||
                this.props.thread.unread_replies
            )
        ) {
            this.props.actions.updateThreadRead(
                this.props.userId,
                this.props.teamId,
                this.props.rootId,
                Date.now(),
            );
        }
    }

    close = () => {
        const {componentId} = this.props;
        popTopScreen(componentId);
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

    registerTypingAnimation = (animation) => {
        const length = this.typingAnimations.push(animation);
        const removeAnimation = () => {
            const animationIndex = length - 1;
            this.typingAnimations = this.typingAnimations.filter((a, index) => index !== animationIndex);
        };

        return removeAnimation;
    }

    runTypingAnimations = (typingVisible) => {
        Animated.parallel(
            this.typingAnimations.map((animation) => animation(typingVisible)),
        ).start();
    }

    bottomPaddingAnimation = (visible) => {
        const [padding, duration] = visible ?
            [TYPING_HEIGHT, 200] :
            [0, 400];

        return Animated.timing(this.bottomPadding, {
            toValue: padding,
            duration,
            useNativeDriver: false,
        });
    }
}

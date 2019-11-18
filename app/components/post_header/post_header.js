// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    View,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import FormattedTime from 'app/components/formatted_time';
import FormattedDate from 'app/components/formatted_date';
import ReplyIcon from 'app/components/reply_icon';
import Tag, {BotTag, GuestTag} from 'app/components/tag';
import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import {emptyFunction} from 'app/utils/general';
import {t} from 'app/utils/i18n';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class PostHeader extends PureComponent {
    static propTypes = {
        commentCount: PropTypes.number,
        commentedOnDisplayName: PropTypes.string,
        createAt: PropTypes.number.isRequired,
        displayName: PropTypes.string,
        enablePostUsernameOverride: PropTypes.bool,
        fromWebHook: PropTypes.bool,
        isPendingOrFailedPost: PropTypes.bool,
        isSearchResult: PropTypes.bool,
        isSystemMessage: PropTypes.bool,
        fromAutoResponder: PropTypes.bool,
        militaryTime: PropTypes.bool,
        onPress: PropTypes.func,
        onUsernamePress: PropTypes.func,
        overrideUsername: PropTypes.string,
        renderReplies: PropTypes.bool,
        shouldRenderReplyButton: PropTypes.bool,
        showFullDate: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        username: PropTypes.string,
        isBot: PropTypes.bool,
        isGuest: PropTypes.bool,
        userTimezone: PropTypes.string,
        enableTimezone: PropTypes.bool,
        previousPostExists: PropTypes.bool,
        post: PropTypes.object,
        beforePrevPostUserId: PropTypes.string,
        isFirstReply: PropTypes.bool,
    };

    static defaultProps = {
        commentCount: 0,
        onPress: emptyFunction,
        onUsernamePress: emptyFunction,
    };

    handleUsernamePress = () => {
        if (this.props.username) {
            this.props.onUsernamePress(this.props.username);
        }
    };

    renderCommentedOnMessage = () => {
        const {
            beforePrevPostUserId,
            commentedOnDisplayName,
            post,
            previousPostExists,
            renderReplies,
            theme,
            isFirstReply,
        } = this.props;
        if (!isFirstReply || !renderReplies || !commentedOnDisplayName || (!previousPostExists && post.user_id === beforePrevPostUserId)) {
            return null;
        }

        const style = getStyleSheet(theme);
        const displayName = commentedOnDisplayName;

        let name;
        if (displayName) {
            name = displayName;
        } else {
            name = (
                <FormattedText
                    id='channel_loader.someone'
                    defaultMessage='Someone'
                />
            );
        }

        let apostrophe;
        if (displayName && displayName.slice(-1) === 's') {
            apostrophe = '\'';
        } else {
            apostrophe = '\'s';
        }

        return (
            <FormattedText
                id='post_body.commentedOn'
                defaultMessage='Commented on {name}{apostrophe} message: '
                values={{
                    name,
                    apostrophe,
                }}
                style={style.commentedOn}
            />
        );
    };

    renderDisplayName = () => {
        const {
            displayName,
            enablePostUsernameOverride,
            fromWebHook,
            isSystemMessage,
            fromAutoResponder,
            overrideUsername,
            theme,
            renderReplies,
            shouldRenderReplyButton,
            commentedOnDisplayName,
            commentCount,
            isBot,
        } = this.props;

        const style = getStyleSheet(theme);
        const showReply = shouldRenderReplyButton || (!commentedOnDisplayName && commentCount > 0 && renderReplies);
        const displayNameStyle = [style.displayNameContainer, showReply && (isBot || fromAutoResponder || fromWebHook) ? style.displayNameContainerBotReplyWidth : null];

        if (fromAutoResponder || fromWebHook) {
            let name = displayName;
            if (overrideUsername && enablePostUsernameOverride) {
                name = overrideUsername;
            }

            return (
                <View style={displayNameStyle}>
                    <Text
                        style={style.displayName}
                        ellipsizeMode={'tail'}
                        numberOfLines={1}
                    >
                        {name}
                    </Text>
                </View>
            );
        } else if (isSystemMessage) {
            return (
                <View style={style.displayNameContainer}>
                    <FormattedText
                        id='post_info.system'
                        defaultMessage='System'
                        style={[style.displayName]}
                    />
                </View>
            );
        } else if (displayName) {
            return (
                <TouchableWithFeedback
                    onPress={this.handleUsernamePress}
                    style={displayNameStyle}
                    type={'opacity'}
                >
                    <Text
                        style={style.displayName}
                        ellipsizeMode={'tail'}
                        numberOfLines={1}
                    >
                        {displayName}
                    </Text>
                </TouchableWithFeedback>
            );
        }

        return (
            <View style={style.displayNameContainer}>
                <FormattedText
                    id='channel_loader.someone'
                    defaultMessage='Someone'
                    style={style.displayName}
                />
            </View>
        );
    };

    renderReply = () => {
        const {
            commentCount,
            commentedOnDisplayName,
            isSearchResult,
            onPress,
            renderReplies,
            shouldRenderReplyButton,
            theme,
        } = this.props;
        const style = getStyleSheet(theme);
        const showReply = shouldRenderReplyButton || (!commentedOnDisplayName && commentCount > 0 && renderReplies);

        if (!showReply) {
            return null;
        }

        return (
            <View style={style.replyWrapper}>
                <TouchableWithFeedback
                    onPress={onPress}
                    style={style.replyIconContainer}
                    type={'opacity'}
                >
                    <ReplyIcon
                        height={16}
                        width={16}
                        color={theme.linkColor}
                    />
                    {!isSearchResult &&
                    <Text style={style.replyText}>{commentCount}</Text>
                    }
                </TouchableWithFeedback>
            </View>
        );
    };

    renderTag = () => {
        const {fromAutoResponder, fromWebHook, isBot, isSystemMessage, isGuest, theme} = this.props;
        const style = getStyleSheet(theme);

        if (fromWebHook || isBot) {
            return (
                <BotTag
                    style={style.tag}
                    theme={theme}
                />
            );
        } else if (isSystemMessage) {
            return null;
        } else if (isGuest) {
            return (
                <GuestTag
                    style={style.tag}
                    theme={theme}
                />
            );
        } else if (fromAutoResponder) {
            return (
                <Tag
                    id={t('post_info.auto_responder')}
                    defaultMessage={'AUTOMATIC REPLY'}
                    style={style.tag}
                    theme={theme}
                />
            );
        }

        return null;
    };

    render() {
        const {
            createAt,
            isPendingOrFailedPost,
            userTimezone,
            militaryTime,
            showFullDate,
            theme,
        } = this.props;
        const style = getStyleSheet(theme);

        let dateComponent;
        if (showFullDate) {
            dateComponent = (
                <FormattedDate
                    format={`ddd, MMM DD, YYYY ${militaryTime ? 'HH:mm' : 'hh:mm A'}`}
                    timeZone={userTimezone}
                    value={createAt}
                    style={style.time}
                />
            );
        } else {
            dateComponent = (
                <FormattedTime
                    timeZone={userTimezone}
                    hour12={!militaryTime}
                    value={createAt}
                    style={style.time}
                />
            );
        }

        return (
            <React.Fragment>
                <View style={[style.container, (isPendingOrFailedPost && style.pendingPost)]}>
                    <View style={style.wrapper}>
                        {this.renderDisplayName()}
                        {this.renderTag()}
                        {dateComponent}
                        {this.renderReply()}
                    </View>
                </View>
                {this.renderCommentedOnMessage(style)}
            </React.Fragment>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            marginTop: 10,
        },
        pendingPost: {
            opacity: 0.5,
        },
        tag: {
            marginLeft: 0,
            marginRight: 5,
            marginBottom: 5,
        },
        wrapper: {
            flex: 1,
            flexDirection: 'row',
        },
        displayNameContainer: {
            maxWidth: '60%',
            marginRight: 5,
            marginBottom: 3,
        },
        displayName: {
            color: theme.centerChannelColor,
            fontSize: 15,
            fontWeight: '600',
            flexGrow: 1,
            paddingVertical: 2,
        },
        time: {
            color: theme.centerChannelColor,
            fontSize: 12,
            marginTop: 5,
            opacity: 0.5,
            flex: 1,
        },
        replyWrapper: {
            flex: 1,
            justifyContent: 'flex-end',
        },
        replyIconContainer: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            minWidth: 40,
            paddingTop: 2,
            paddingBottom: 10,
            flex: 1,
        },
        replyText: {
            fontSize: 12,
            marginLeft: 2,
            marginTop: 2,
            color: theme.linkColor,
        },
        commentedOn: {
            color: changeOpacity(theme.centerChannelColor, 0.65),
            marginBottom: 3,
            lineHeight: 21,
        },
        displayNameContainerBotReplyWidth: {
            maxWidth: '50%',
        },
    };
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import FormattedTime from 'app/components/formatted_time';
import FormattedDate from 'app/components/formatted_date';
import ReplyIcon from 'app/components/reply_icon';
import BotTag from 'app/components/bot_tag';
import {emptyFunction} from 'app/utils/general';
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
        userTimezone: PropTypes.string,
        enableTimezone: PropTypes.bool,
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
    }

    getDisplayName = (style) => {
        const {
            enablePostUsernameOverride,
            fromWebHook,
            isSystemMessage,
            fromAutoResponder,
            overrideUsername,
            isBot,
        } = this.props;

        if (fromWebHook) {
            let name = this.props.displayName;
            if (overrideUsername && enablePostUsernameOverride) {
                name = overrideUsername;
            }

            return (
                <View style={style.indicatorContainer}>
                    <Text style={style.displayName}>
                        {name}
                    </Text>
                    <BotTag
                        theme={this.props.theme}
                    />
                </View>
            );
        } else if (isBot) {
            return (
                <TouchableOpacity onPress={this.handleUsernamePress}>
                    <View style={style.indicatorContainer}>
                        <Text style={style.displayName}>
                            {this.props.displayName}
                        </Text>
                        <BotTag
                            theme={this.props.theme}
                        />
                    </View>
                </TouchableOpacity>
            );
        } else if (fromAutoResponder) {
            let name = this.props.displayName;
            if (overrideUsername && enablePostUsernameOverride) {
                name = overrideUsername;
            }

            return (
                <View style={style.indicatorContainer}>
                    <Text style={style.displayName}>
                        {name}
                    </Text>
                    <FormattedText
                        id='post_info.auto_responder'
                        defaultMessage='AUTOMATIC REPLY'
                        style={style.bot}
                    />
                </View>
            );
        } else if (isSystemMessage) {
            return (
                <FormattedText
                    id='post_info.system'
                    defaultMessage='System'
                    style={style.displayName}
                />
            );
        } else if (this.props.displayName) {
            return (
                <TouchableOpacity onPress={this.handleUsernamePress}>
                    <Text style={style.displayName}>
                        {this.props.displayName}
                    </Text>
                </TouchableOpacity>
            );
        }

        return (
            <FormattedText
                id='channel_loader.someone'
                defaultMessage='Someone'
                style={style.displayName}
            />
        );
    };

    renderCommentedOnMessage = (style) => {
        if (!this.props.renderReplies || !this.props.commentedOnDisplayName) {
            return null;
        }

        const displayName = this.props.commentedOnDisplayName;

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

    render() {
        const {
            commentedOnDisplayName,
            commentCount,
            createAt,
            isPendingOrFailedPost,
            isSearchResult,
            userTimezone,
            militaryTime,
            onPress,
            renderReplies,
            shouldRenderReplyButton,
            showFullDate,
            theme,
        } = this.props;
        const style = getStyleSheet(theme);
        const showReply = shouldRenderReplyButton || (!commentedOnDisplayName && commentCount > 0 && renderReplies);

        let dateComponent;
        if (showFullDate) {
            dateComponent = (
                <View style={style.datetime}>
                    <Text style={style.time}>
                        <FormattedDate value={createAt}/>
                    </Text>
                    <Text style={style.time}>
                        <FormattedTime
                            timeZone={userTimezone}
                            hour12={!militaryTime}
                            value={createAt}
                        />
                    </Text>
                </View>
            );
        } else {
            dateComponent = (
                <Text style={style.time}>
                    <FormattedTime
                        timeZone={userTimezone}
                        hour12={!militaryTime}
                        value={createAt}
                    />
                </Text>
            );
        }

        return (
            <React.Fragment>
                <View style={[style.postInfoContainer, (isPendingOrFailedPost && style.pendingPost)]}>
                    <View style={{flexDirection: 'row', flex: 1}}>
                        {this.getDisplayName(style)}
                        <View style={style.timeContainer}>
                            {dateComponent}
                        </View>
                    </View>
                    {showReply &&
                    <TouchableOpacity
                        onPress={onPress}
                        style={style.replyIconContainer}
                    >
                        <ReplyIcon
                            height={15}
                            width={15}
                            color={theme.linkColor}
                        />
                        {!isSearchResult &&
                        <Text style={style.replyText}>{commentCount}</Text>
                        }
                    </TouchableOpacity>
                    }
                </View>
                {commentedOnDisplayName !== '' &&
                <View>
                    {this.renderCommentedOnMessage(style)}
                </View>
                }
            </React.Fragment>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        commentedOn: {
            color: changeOpacity(theme.centerChannelColor, 0.65),
            marginBottom: 3,
            lineHeight: 21,
        },
        postInfoContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            marginTop: 10,
        },
        pendingPost: {
            opacity: 0.5,
        },
        timeContainer: {
            justifyContent: 'center',
        },
        datetime: {
            flex: 1,
            flexDirection: 'row',
        },
        time: {
            color: theme.centerChannelColor,
            fontSize: 13,
            marginLeft: 5,
            marginBottom: 1,
            opacity: 0.5,
        },
        replyIconContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: -10,
            minWidth: 40,
            paddingVertical: 10,
        },
        replyText: {
            fontSize: 15,
            marginLeft: 3,
            color: theme.linkColor,
        },
        indicatorContainer: {
            flexDirection: 'row',
        },
        displayName: {
            color: theme.centerChannelColor,
            fontSize: 15,
            fontWeight: '600',
            marginRight: 5,
            marginBottom: 3,
        },
        flagContainer: {
            marginLeft: 10,
            alignSelf: 'center',
            ...Platform.select({
                ios: {
                    marginBottom: 2,
                },
                android: {
                    marginBottom: 1,
                },
            }),
        },
    };
});

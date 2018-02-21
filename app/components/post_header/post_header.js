// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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
import FlagIcon from 'app/components/flag_icon';
import {emptyFunction} from 'app/utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const BOT_NAME = 'BOT';

export default class PostHeader extends PureComponent {
    static propTypes = {
        commentCount: PropTypes.number,
        commentedOnDisplayName: PropTypes.string,
        createAt: PropTypes.number.isRequired,
        displayName: PropTypes.string.isRequired,
        enablePostUsernameOverride: PropTypes.bool,
        fromWebHook: PropTypes.bool,
        isPendingOrFailedPost: PropTypes.bool,
        isSearchResult: PropTypes.bool,
        isSystemMessage: PropTypes.bool,
        militaryTime: PropTypes.bool,
        onPress: PropTypes.func,
        onUsernamePress: PropTypes.func,
        overrideUsername: PropTypes.string,
        renderReplies: PropTypes.bool,
        shouldRenderReplyButton: PropTypes.bool,
        showFullDate: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        username: PropTypes.string.isRequired,
        isFlagged: PropTypes.bool,
    };

    static defaultProps = {
        commentCount: 0,
        onPress: emptyFunction,
        onUsernamePress: emptyFunction,
    };

    handleUsernamePress = () => {
        this.props.onUsernamePress(this.props.username);
    }

    getDisplayName = (style) => {
        const {
            enablePostUsernameOverride,
            fromWebHook,
            isSystemMessage,
            overrideUsername,
        } = this.props;

        if (fromWebHook) {
            let name = this.props.displayName;
            if (overrideUsername && enablePostUsernameOverride) {
                name = overrideUsername;
            }

            return (
                <View style={style.botContainer}>
                    <Text style={style.displayName}>
                        {name}
                    </Text>
                    <Text style={style.bot}>
                        {BOT_NAME}
                    </Text>
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
            militaryTime,
            onPress,
            renderReplies,
            shouldRenderReplyButton,
            showFullDate,
            theme,
            isFlagged,
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
                        hour12={!militaryTime}
                        value={createAt}
                    />
                </Text>
            );
        }

        return (
            <View>
                <View style={[style.postInfoContainer, (isPendingOrFailedPost && style.pendingPost)]}>
                    <View style={{flexDirection: 'row', flex: 1}}>
                        {this.getDisplayName(style)}
                        <View style={style.timeContainer}>
                            {dateComponent}
                        </View>
                        {isFlagged &&
                            <View style={style.flagContainer}>
                                <FlagIcon
                                    height={11}
                                    width={11}
                                    color={theme.linkColor}
                                />
                            </View>
                        }
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
            </View>
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
            height: 30,
            minWidth: 40,
            paddingVertical: 10,
        },
        replyText: {
            fontSize: 15,
            marginLeft: 3,
            color: theme.linkColor,
        },
        botContainer: {
            flexDirection: 'row',
        },
        bot: {
            alignSelf: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderRadius: 2,
            color: theme.centerChannelColor,
            fontSize: 10,
            fontWeight: '600',
            marginRight: 5,
            paddingVertical: 2,
            paddingHorizontal: 4,
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

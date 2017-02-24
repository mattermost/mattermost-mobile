// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Platform,
    TouchableHighlight,
    View, Text
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import Autocomplete from 'app/components/autocomplete';
import FormattedText from 'app/components/formatted_text';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {changeOpacity} from 'app/utils/theme';

// import PaperClipIcon from './components/paper_clip_icon.js';

const MAX_CONTENT_HEIGHT = 100;

export default class PostTextbox extends PureComponent {
    static propTypes = {
        currentUserId: PropTypes.string.isRequired,
        typing: PropTypes.array.isRequired,
        teamId: PropTypes.string.isRequired,
        channelId: PropTypes.string.isRequired,
        rootId: PropTypes.string,
        value: PropTypes.string.isRequired,
        onChangeText: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            createPost: PropTypes.func.isRequired,
            userTyping: PropTypes.func.isRequired
        }).isRequired
    };

    static defaultProps = {
        rootId: '',
        onSelectionChange: () => true
    };

    constructor(props) {
        super(props);

        this.state = {
            contentHeight: 0
        };
    }

    blur = () => {
        this.refs.input.getWrappedInstance().blur();
    };

    handleContentSizeChange = (e) => {
        this.setState({
            contentHeight: e.nativeEvent.contentSize.height
        });
    };

    sendMessage = () => {
        if (this.props.value.trim().length === 0) {
            return;
        }

        const post = {
            user_id: this.props.currentUserId,
            channel_id: this.props.channelId,
            root_id: this.props.rootId,
            parent_id: this.props.rootId,
            message: this.props.value
        };

        this.props.actions.createPost(this.props.teamId, post);
        this.handleTextChange('');
    };

    handleTextChange = (text) => {
        const {
            onChangeText,
            channelId,
            rootId,
            actions
        } = this.props;

        onChangeText(text);
        actions.userTyping(channelId, rootId);
    };

    handleSelectionChange = (event) => {
        if (this.autocomplete) {
            this.autocomplete.handleSelectionChange(event);
        }
    };

    attachAutocomplete = (c) => {
        this.autocomplete = c;
    };

    renderTyping = () => {
        const {typing} = this.props;
        const numUsers = typing.length;

        switch (numUsers) {
        case 0:
            return null;
        case 1:
            return (
                <FormattedText
                    id='msg_typing.isTyping'
                    defaultMessage='{user} is typing...'
                    values={{
                        user: typing[0]
                    }}
                />
            );
        default: {
            const last = typing.pop();
            return (
                <FormattedText
                    id='msg_typing.areTyping'
                    defaultMessage='{users} and {last} are typing...'
                    values={{
                        users: (typing.join(', ')),
                        last
                    }}
                />
            );
        }
        }
    };

    render() {
        const {theme} = this.props;

        let placeholder;
        if (this.props.rootId) {
            placeholder = {id: 'create_comment.addComment', defaultMessage: 'Add a comment...'};
        } else {
            placeholder = {id: 'create_post.write', defaultMessage: 'Write a message...'};
        }

        return (
            <View style={{padding: 7}}>
                <View>
                    <Text
                        style={{
                            opacity: 0.7,
                            fontSize: 11,
                            marginBottom: 5,
                            color: theme.centerChannelColor
                        }}
                        ellipsizeMode='tail'
                        numberOfLines={1}
                    >
                        {this.renderTyping()}
                    </Text>
                </View>
                <Autocomplete
                    ref={this.attachAutocomplete}
                    onChangeText={this.props.onChangeText}
                    rootId={this.props.rootId}
                />
                <View
                    style={{
                        alignItems: 'flex-end',
                        backgroundColor: theme.centerChannelBg,
                        flexDirection: 'row'
                    }}
                >
                    {/*<TouchableHighlight
                        style={{
                            height: 36,
                            padding: 9,
                            width: 36
                        }}
                    >
                        <PaperClipIcon
                            width={18}
                            height={18}
                            color={changeOpacity(theme.centerChannelColor, 0.9)}
                        />
                    </TouchableHighlight>
                    <View style={{width: 7}}/>*/}
                    <TextInputWithLocalizedPlaceholder
                        ref='input'
                        value={this.props.value}
                        onChangeText={this.handleTextChange}
                        onSelectionChange={this.handleSelectionChange}
                        onContentSizeChange={this.handleContentSizeChange}
                        placeholder={placeholder}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                        onSubmitEditing={this.sendMessage}
                        multiline={true}
                        underlineColorAndroid='transparent'
                        style={{
                            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
                            borderWidth: 1,
                            color: theme.centerChannelColor,
                            flex: 1,
                            fontSize: 14,
                            height: Math.min(this.state.contentHeight, MAX_CONTENT_HEIGHT),
                            paddingBottom: 8,
                            paddingLeft: 12,
                            paddingRight: 12,
                            paddingTop: 6
                        }}
                    />
                    <View style={{width: 7}}/>
                    <TouchableHighlight onPress={this.sendMessage}>
                        <Icon
                            name='paper-plane'
                            size={18}
                            style={{
                                color: theme.linkColor,
                                ...Platform.select({
                                    ios: {
                                        paddingVertical: 8
                                    },
                                    android: {
                                        paddingVertical: 7
                                    }
                                }),
                                paddingHorizontal: 9
                            }}
                        />
                    </TouchableHighlight>
                </View>
            </View>
        );
    }
}

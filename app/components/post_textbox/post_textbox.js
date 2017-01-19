// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {TouchableHighlight, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {changeOpacity} from 'app/utils/colors';

// import PaperClipIcon from './components/paper_clip_icon.js';

const MAX_CONTENT_HEIGHT = 100;

export default class PostTextbox extends React.PureComponent {
    static propTypes = {
        currentUserId: React.PropTypes.string.isRequired,
        teamId: React.PropTypes.string.isRequired,
        channelId: React.PropTypes.string.isRequired,
        rootId: React.PropTypes.string,
        value: React.PropTypes.string.isRequired,
        onChangeText: React.PropTypes.func.isRequired,
        theme: React.PropTypes.object.isRequired,
        actions: React.PropTypes.shape({
            createPost: React.PropTypes.func.isRequired
        }).isRequired
    };

    static defaultProps = {
        rootId: ''
    };

    constructor(props) {
        super(props);

        this.state = {
            contentHeight: 0
        };
    }

    blur = () => {
        this.refs.input.getWrappedInstance().blur();
    }

    handleContentSizeChange = (e) => {
        this.setState({
            contentHeight: e.nativeEvent.contentSize.height
        });
    }

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
        this.props.onChangeText('');
    }

    render() {
        const theme = this.props.theme;

        let placeholder;
        if (this.props.rootId) {
            placeholder = {id: 'create_comment.addComment', defaultMessage: 'Add a comment...'};
        } else {
            placeholder = {id: 'create_post.write', defaultMessage: 'Write a message...'};
        }

        return (
            <View
                style={{
                    alignItems: 'flex-end',
                    backgroundColor: theme.centerChannelBg,
                    flexDirection: 'row',
                    padding: 7
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
                    onChangeText={this.props.onChangeText}
                    onContentSizeChange={this.handleContentSizeChange}
                    placeholder={placeholder}
                    onSubmitEditing={this.sendMessage}
                    multiline={true}
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
                <TouchableHighlight
                    onPress={this.sendMessage}
                    style={{
                        height: 36,
                        width: 36
                    }}
                >
                    <Icon
                        name='paper-plane'
                        size={18}
                        style={{
                            color: theme.linkColor,
                            padding: 9
                        }}
                    />
                </TouchableHighlight>
            </View>
        );
    }
}

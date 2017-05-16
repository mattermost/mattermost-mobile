// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Dimensions,
    Platform,
    StatusBar,
    StyleSheet,
    View
} from 'react-native';

import ErrorText from 'app/components/error_text';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import Loading from 'app/components/loading';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {RequestStatus} from 'mattermost-redux/constants';

class EditPost extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            editPost: PropTypes.func.isRequired
        }),
        closeButton: PropTypes.object,
        editPostRequest: PropTypes.object.isRequired,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        post: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired
    };

    leftButton = {
        id: 'close-edit-post'
    };

    rightButton = {
        id: 'edit-post',
        showAsAction: 'always'
    };

    constructor(props) {
        super(props);

        this.state = {message: props.post.message};
        this.rightButton.title = props.intl.formatMessage({id: 'edit_post.save', defaultMessage: 'Save'});

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons({
            leftButtons: [{...this.leftButton, icon: props.closeButton}],
            rightButtons: [this.rightButton]
        });
    }

    componentDidMount() {
        this.focus();
    }

    componentWillReceiveProps(nextProps) {
        const {editPostRequest} = nextProps;

        if (this.props.editPostRequest !== editPostRequest) {
            switch (editPostRequest.status) {
            case RequestStatus.STARTED:
                this.emitEditing(true);
                this.setState({error: null, editing: true});
                break;
            case RequestStatus.SUCCESS:
                this.emitEditing(false);
                this.setState({error: null, editing: false});
                this.close();
                break;
            case RequestStatus.FAILURE:
                this.emitEditing(false);
                this.setState({error: editPostRequest.error, editing: false});
                break;
            }
        }
    }

    close = () => {
        this.props.navigator.dismissModal({
            animationType: 'slide-down'
        });
    };

    emitCanEditPost = (enabled) => {
        this.props.navigator.setButtons({
            leftButtons: [this.leftButton],
            rightButtons: [{...this.rightButton, disabled: !enabled}]
        });
    };

    emitEditing = (loading) => {
        this.props.navigator.setButtons({
            leftButtons: [this.leftButton],
            rightButtons: [{...this.rightButton, disabled: loading}]
        });
    };

    focus = () => {
        this.messageInput.refs.wrappedInstance.focus();
    };

    handleSubmit = () => {
        // Workaround for android as the multiline is not working
        if (Platform.OS === 'android') {
            if (this.timeout) {
                clearTimeout(this.timeout);
            }
            this.timeout = setTimeout(() => {
                let {message: msg} = this.state;
                msg += '\n';
                this.setState({message: msg});
            }, 100);
        }
    };

    messageRef = (ref) => {
        this.messageInput = ref;
    };

    onEditPost = () => {
        const {message} = this.state;
        const post = Object.assign({}, this.props.post, {message});
        this.props.actions.editPost(post);
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            switch (event.id) {
            case 'close-edit-post':
                this.close();
                break;
            case 'edit-post':
                this.onEditPost();
                break;
            }
        }
    };

    onPostChangeText = (message) => {
        this.setState({message});
        if (message) {
            this.emitCanEditPost(true);
        } else {
            this.emitCanEditPost(false);
        }
    };

    render() {
        const {theme} = this.props;
        const {editing, message, error} = this.state;
        const {height, width} = Dimensions.get('window');

        const style = getStyleSheet(theme);

        if (editing) {
            return (
                <View style={style.container}>
                    <StatusBar barStyle='light-content'/>
                    <Loading/>
                </View>
            );
        }

        let displayError;
        if (error) {
            displayError = (
                <View style={[style.errorContainer, {width}]}>
                    <View style={style.errorWrapper}>
                        <ErrorText error={error}/>
                    </View>
                </View>
            );
        }

        return (
            <KeyboardLayout
                behavior='padding'
                style={style.container}
                keyboardVerticalOffset={0}
            >
                <StatusBar barStyle='light-content'/>
                <View style={style.scrollView}>
                    {displayError}
                    <View style={[style.inputContainer, {height: Platform.OS === 'android' ? (height / 2) - 20 : (height / 2)}]}>
                        <TextInputWithLocalizedPlaceholder
                            ref={this.messageRef}
                            value={message}
                            blurOnSubmit={false}
                            onChangeText={this.onPostChangeText}
                            multiline={true}
                            numberOfLines={10}
                            style={[style.input, {height: height / 2}]}
                            autoCapitalize='none'
                            autoCorrect={false}
                            placeholder={{id: 'edit_post.editPost', defaultMessage: 'Edit the post...'}}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                            underlineColorAndroid='transparent'
                            onSubmitEditing={this.handleSubmit}
                        />
                    </View>
                </View>
            </KeyboardLayout>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03)
        },
        errorContainer: {
            position: 'absolute'
        },
        errorWrapper: {
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10
        },
        inputContainer: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
            marginTop: 2
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 14,
            padding: 15,
            textAlignVertical: 'top'
        }
    });
});

export default injectIntl(EditPost);

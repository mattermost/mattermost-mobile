// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    InteractionManager,
    ScrollView,
    Text,
    View,
    Platform,
} from 'react-native';
import * as Animatable from 'react-native-animatable';

import EventEmitter from '@redux/utils/event_emitter';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import FileUploadItem from './file_upload_item';

const showFiles = {opacity: 1, height: 68};
const hideFiles = {opacity: 0, height: 0};
const hideError = {height: 0};

export default class FileUploadPreview extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string.isRequired,
        channelIsLoading: PropTypes.bool,
        files: PropTypes.array.isRequired,
        filesUploadingForCurrentChannel: PropTypes.bool.isRequired,
        rootId: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        files: [],
    };

    state = {
        fileSizeWarning: null,
        showFileMaxWarning: false,
    };

    errorRef = React.createRef();
    errorContainerRef = React.createRef();
    containerRef = React.createRef();

    componentDidMount() {
        EventEmitter.on('fileMaxWarning', this.handleFileMaxWarning);
        EventEmitter.on('fileSizeWarning', this.handleFileSizeWarning);

        if (this.props.files.length) {
            InteractionManager.runAfterInteractions(this.showOrHideContainer);
        }
    }

    componentWillUnmount() {
        EventEmitter.off('fileMaxWarning', this.handleFileMaxWarning);
        EventEmitter.off('fileSizeWarning', this.handleFileSizeWarning);
    }

    componentDidUpdate(prevProps) {
        if (this.containerRef.current && this.props.files.length !== prevProps.files.length) {
            InteractionManager.runAfterInteractions(this.showOrHideContainer);
        }
    }

    buildFilePreviews = () => {
        return this.props.files.map((file) => {
            return (
                <FileUploadItem
                    key={file.clientId}
                    channelId={this.props.channelId}
                    file={file}
                    rootId={this.props.rootId}
                    theme={this.props.theme}
                />
            );
        });
    };

    clearErrorsFromState = (delay) => {
        setTimeout(() => {
            this.setState({
                showFileMaxWarning: false,
                fileSizeWarning: null,
            });
        }, delay || 0);
    }

    handleFileMaxWarning = () => {
        this.setState({showFileMaxWarning: true});
        if (this.errorRef.current) {
            this.makeErrorVisible(true, 20);
            setTimeout(() => {
                this.makeErrorVisible(false, 20);
            }, 5000);
        }
    };

    handleFileSizeWarning = (message) => {
        if (this.errorRef.current) {
            if (message) {
                this.setState({fileSizeWarning: message.replace(': ', ':\n')});
                this.makeErrorVisible(true, 40);
            } else {
                this.makeErrorVisible(false, 20);
            }
        }
    };

    makeErrorVisible = (visible, height) => {
        if (this.errorContainerRef.current) {
            if (visible) {
                this.errorContainerRef.current.transition(hideError, {height}, 200, 'ease-out');
            } else {
                this.errorContainerRef.current.transition({height}, hideError, 200, 'ease-in');
            }
        }
    }

    showOrHideContainer = () => {
        const {
            channelIsLoading,
            filesUploadingForCurrentChannel,
            files,
        } = this.props;

        if ((channelIsLoading || (!files.length && !filesUploadingForCurrentChannel))) {
            this.containerRef.current.transition(showFiles, hideFiles, 150, 'ease-out');
            this.shown = false;
        } else if (files.length && !this.shown) {
            this.containerRef.current.transition(hideFiles, showFiles, 350, 'ease-in');
            this.shown = true;
        }
    }

    render() {
        const {fileSizeWarning, showFileMaxWarning} = this.state;
        const {theme, files} = this.props;
        const style = getStyleSheet(theme);
        const fileContainerStyle = {
            paddingBottom: files.length ? 5 : 0,
        };

        return (
            <View style={style.previewContainer}>
                <Animatable.View
                    style={[style.fileContainer, fileContainerStyle]}
                    ref={this.containerRef}
                    isInteraction={true}
                >
                    <ScrollView
                        horizontal={true}
                        style={style.scrollView}
                        contentContainerStyle={style.scrollViewContent}
                        keyboardShouldPersistTaps={'handled'}
                    >
                        {this.buildFilePreviews()}
                    </ScrollView>
                </Animatable.View>
                <Animatable.View
                    ref={this.errorContainerRef}
                    style={style.errorContainer}
                    isInteraction={true}
                >
                    <Animatable.View
                        ref={this.errorRef}
                        isInteraction={true}
                        style={style.errorTextContainer}
                        useNativeDriver={true}
                    >
                        {showFileMaxWarning && (
                            <FormattedText
                                style={style.warning}
                                id='mobile.file_upload.max_warning'
                                defaultMessage='Uploads limited to 5 files maximum.'
                            />
                        )}
                        {Boolean(fileSizeWarning) &&
                            <Text style={style.warning}>
                                {fileSizeWarning}
                            </Text>
                        }
                    </Animatable.View>
                </Animatable.View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        previewContainer: {
            display: 'flex',
            flexDirection: 'column',
        },
        fileContainer: {
            display: 'flex',
            flexDirection: 'row',
            height: 0,
        },
        errorContainer: {
            height: 0,
        },
        errorTextContainer: {
            marginTop: Platform.select({
                ios: 4,
                android: 2,
            }),
            marginHorizontal: 12,
            flex: 1,
        },
        scrollView: {
            flex: 1,
        },
        scrollViewContent: {
            alignItems: 'flex-end',
            paddingRight: 12,
        },
        warning: {
            color: theme.errorTextColor,
            flex: 1,
            flexWrap: 'wrap',
        },
    };
});

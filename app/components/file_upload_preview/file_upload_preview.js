// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    InteractionManager,
    ScrollView,
    Text,
    View,
} from 'react-native';
import * as Animatable from 'react-native-animatable';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import FileUploadItem from './file_upload_item';

const initial = {opacity: 0, height: 0, translateX: -100};
const final = {opacity: 1, height: 20, translateX: 0};
const showFiles = {opacity: 1, height: 76};
const hideFiles = {opacity: 0, height: 0};

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

    animationRef = React.createRef();
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

    showOrHideContainer = () => {
        const {
            channelIsLoading,
            filesUploadingForCurrentChannel,
            files,
        } = this.props;
        const {fileSizeWarning, showFileMaxWarning} = this.state;

        if (
            !fileSizeWarning && !showFileMaxWarning &&
            (channelIsLoading || (!files.length && !filesUploadingForCurrentChannel))
        ) {
            this.containerRef.current.transition(showFiles, hideFiles, 150, 'ease-out');
            this.shown = false;
        } else if (files.length && !this.shown) {
            this.containerRef.current.transition(hideFiles, showFiles, 350, 'ease-in');
            this.shown = true;
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

    handleFileMaxWarning = () => {
        this.setState({showFileMaxWarning: true});
        if (this.animationRef.current) {
            this.animationRef.current.transition(initial, final, 350, 'ease-in');
            setTimeout(() => {
                this.animationRef.current.transition(final, initial, 350, 'ease-out');
                InteractionManager.runAfterInteractions(() => this.setState({showFileMaxWarning: false}));
            }, 5000);
        }
    };

    handleFileSizeWarning = (message) => {
        if (this.animationRef.current) {
            const newFinal = {...final, height: 42};
            if (message) {
                this.setState({fileSizeWarning: message});
                this.animationRef.current.transition(initial, newFinal, 350, 'ease-in');
            } else {
                this.animationRef.current.transition(newFinal, initial, 350, 'ease-out');
                InteractionManager.runAfterInteractions(() => {
                    this.setState({fileSizeWarning: message});
                });
            }
        }
    };

    render() {
        const {fileSizeWarning, showFileMaxWarning} = this.state;
        const style = getStyleSheet(this.props.theme);

        return (
            <View style={style.previewContainer}>
                <Animatable.View
                    style={style.fileContainer}
                    ref={this.containerRef}
                    isInteraction={true}
                    duration={300}
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
                    ref={this.animationRef}
                    isInteraction={true}
                    style={style.errorContainer}
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
            marginTop: 5,
            marginHorizontal: 12,
            opacity: 0,
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

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform, StyleSheet, View} from 'react-native';

import {MAX_FILE_COUNT} from '@constants/post_draft';
import EventEmitter from '@mm-redux/utils/event_emitter';

import CameraAction from './camera_quick_action';
import ImageAction from './image_quick_action';
import FileAction from './file_quick_action';
import InputAction from './input_quick_action';
import SendAction from './send_action';

export default class QuickActions extends PureComponent {
    static propTypes = {
        blurTextBox: PropTypes.func.isRequired,
        canUploadFiles: PropTypes.bool,
        canSend: PropTypes.bool,
        fileCount: PropTypes.number,
        initialValue: PropTypes.string,
        inputEventType: PropTypes.string.isRequired,
        maxFileSize: PropTypes.number.isRequired,
        onSend: PropTypes.func.isRequired,
        onShowFileMaxWarning: PropTypes.func.isRequired,
        onTextChange: PropTypes.func.isRequired,
        onUploadFiles: PropTypes.func.isRequired,
        readonly: PropTypes.bool,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        canUploadFiles: true,
        fileCount: 0,
        initialValue: '',
    };

    constructor(props) {
        super(props);

        this.state = {
            inputValue: '',
            atDisabled: props.readonly,
            slashDisabled: props.readonly,
        };
    }

    componentDidMount() {
        EventEmitter.on(this.props.inputEventType, this.handleInputEvent);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.readonly !== this.props.readonly || prevProps.initialValue !== this.props.initialValue) {
            this.handleInputEvent(this.props.initialValue);
        }
    }

    componentWillUnmount() {
        EventEmitter.off(this.props.inputEventType, this.handleInputEvent);
    }

    handleInputEvent = (inputValue) => {
        const {readonly} = this.props;
        const atDisabled = readonly || inputValue[inputValue.length - 1] === '@';
        const slashDisabled = readonly || inputValue.length > 0;

        this.setState({atDisabled, slashDisabled, inputValue});
    };

    onShowFileMaxWarning = () => {
        EventEmitter.emit('fileMaxWarning');
    };

    render() {
        const {
            blurTextBox,
            canUploadFiles,
            canSend,
            fileCount,
            onSend,
            onTextChange,
            onShowFileMaxWarning,
            readonly,
            theme,
            onUploadFiles,
        } = this.props;
        const uploadProps = {
            blurTextBox,
            disabled: !canUploadFiles || readonly,
            fileCount,
            maxFileCount: MAX_FILE_COUNT,
            onShowFileMaxWarning,
            theme,
            onUploadFiles,
        };

        return (
            <View style={style.container}>
                <View style={style.quickActionsContainer}>
                    <InputAction
                        disabled={this.state.atDisabled}
                        inputType='at'
                        onTextChange={onTextChange}
                        theme={theme}
                        value={this.state.inputValue}
                    />
                    <InputAction
                        disabled={this.state.slashDisabled}
                        inputType='slash'
                        onTextChange={onTextChange}
                        theme={theme}
                    />
                    <FileAction {...uploadProps}/>
                    <ImageAction {...uploadProps}/>
                    <CameraAction {...uploadProps}/>
                </View>
                <SendAction
                    disabled={!canSend}
                    handleSendMessage={onSend}
                    theme={theme}
                />
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: Platform.select({
            ios: 1,
            android: 2,
        }),
    },
    quickActionsContainer: {
        display: 'flex',
        flexDirection: 'row',
        height: 44,
    },
});
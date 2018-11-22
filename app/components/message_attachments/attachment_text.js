// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {StyleSheet, View} from 'react-native';
import PropTypes from 'prop-types';

import Markdown from 'app/components/markdown';
import ShowMoreButton from 'app/components/show_more_button';
import CustomPropTypes from 'app/constants/custom_prop_types';

export default class AttachmentText extends PureComponent {
    static propTypes = {
        baseTextStyle: CustomPropTypes.Style.isRequired,
        blockStyles: PropTypes.object.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        hasThumbnail: PropTypes.bool,
        metadata: PropTypes.object,
        navigator: PropTypes.object.isRequired,
        onPermalinkPress: PropTypes.func,
        textStyles: PropTypes.object.isRequired,
        value: PropTypes.string,
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const {deviceHeight} = nextProps;
        const maxHeight = deviceHeight * 0.4;

        if (maxHeight !== prevState.maxHeight) {
            return {
                maxHeight,
            };
        }

        return null;
    }

    constructor(props) {
        super(props);

        this.state = {
            collapsed: true,
            isLongText: false,
        };
    }

    handleLayout = (event) => {
        const {height} = event.nativeEvent.layout;
        const {deviceHeight} = this.props;

        if (height >= (deviceHeight * 0.6)) {
            this.setState({
                isLongText: true,
            });
        }
    };

    toggleCollapseState = () => {
        const {collapsed} = this.state;
        this.setState({collapsed: !collapsed});
    };

    render() {
        const {
            baseTextStyle,
            blockStyles,
            hasThumbnail,
            metadata,
            navigator,
            onPermalinkPress,
            value,
            textStyles,
        } = this.props;
        const {collapsed, isLongText, maxHeight} = this.state;

        if (!value) {
            return null;
        }

        return (
            <View style={hasThumbnail && style.container}>
                <View
                    style={[(isLongText && collapsed && {maxHeight, overflow: 'hidden'})]}
                    removeClippedSubviews={isLongText && collapsed}
                >
                    <Markdown
                        baseTextStyle={baseTextStyle}
                        textStyles={textStyles}
                        blockStyles={blockStyles}
                        imageMetadata={metadata?.images}
                        value={value}
                        navigator={navigator}
                        onPermalinkPress={onPermalinkPress}
                    />
                </View>
                {isLongText &&
                <ShowMoreButton
                    onPress={this.toggleCollapseState}
                    showMore={collapsed}
                />
                }
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        paddingRight: 60,
    },
});

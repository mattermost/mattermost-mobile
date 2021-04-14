// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {LayoutChangeEvent, ScrollView, StyleProp, StyleSheet, TextStyle, View, ViewStyle} from 'react-native';

import Markdown from '@components/markdown';
import ShowMoreButton from '@components/show_more_button';

import {PostMetadata} from '@mm-redux/types/posts';
import {Theme} from '@mm-redux/types/preferences';

const SHOW_MORE_HEIGHT = 60;

type Props = {
    baseTextStyle: StyleProp<TextStyle>,
    blockStyles?: StyleProp<ViewStyle>[],
    deviceHeight: number,
    hasThumbnail?: boolean,
    metadata?: PostMetadata,
    onPermalinkPress?: () => void,
    textStyles?: StyleProp<TextStyle>[],
    theme?: Theme,
    value?: string,
}

type State = {
    collapsed: boolean;
    isLongText: boolean;
    maxHeight: number;
}

function getMaxHeight(deviceHeight: number) {
    return Math.round((deviceHeight * 0.4) + SHOW_MORE_HEIGHT);
}

export default class AttachmentText extends PureComponent<Props, State> {
    static getDerivedStateFromProps(nextProps: Props, prevState: State) {
        const {deviceHeight} = nextProps;
        const maxHeight = getMaxHeight(deviceHeight);

        if (maxHeight !== prevState.maxHeight) {
            return {
                maxHeight,
            };
        }

        return null;
    }

    constructor(props: Props) {
        super(props);

        const maxHeight = getMaxHeight(props.deviceHeight);
        this.state = {
            collapsed: true,
            isLongText: false,
            maxHeight,
        };
    }

    handleLayout = (event: LayoutChangeEvent) => {
        const {height} = event.nativeEvent.layout;
        const {maxHeight} = this.state;

        if (height >= maxHeight) {
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
            onPermalinkPress,
            textStyles,
            theme,
            value,
        } = this.props;
        const {collapsed, isLongText, maxHeight} = this.state;

        if (!value) {
            return null;
        }

        return (
            <View style={hasThumbnail && style.container}>
                <ScrollView
                    style={{maxHeight: (collapsed ? maxHeight : undefined), overflow: 'hidden'}}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                >
                    <View
                        onLayout={this.handleLayout}
                        removeClippedSubviews={isLongText && collapsed}
                    >
                        <Markdown

                            // TODO: remove any when migrating Markdown to typescript
                            baseTextStyle={baseTextStyle as any}
                            textStyles={textStyles}
                            blockStyles={blockStyles}
                            disableGallery={true}
                            imagesMetadata={metadata?.images}
                            value={value}
                            onPermalinkPress={onPermalinkPress}
                        />
                    </View>
                </ScrollView>
                {isLongText &&
                <ShowMoreButton
                    onPress={this.toggleCollapseState}
                    showMore={collapsed}
                    theme={theme}
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

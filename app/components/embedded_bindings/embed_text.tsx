// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {LayoutChangeEvent, ScrollView, StyleProp, View} from 'react-native';

import Markdown from '@components/markdown';
import ShowMoreButton from '@components/show_more_button';
import {Theme} from '@mm-redux/types/preferences';

const SHOW_MORE_HEIGHT = 60;

type Props = {
    baseTextStyle: StyleProp<any>,
    blockStyles?: StyleProp<any>[],
    deviceHeight: number,
    onPermalinkPress?: () => void,
    textStyles?: StyleProp<any>[],
    theme?: Theme,
    value?: string,
}

type State = {
    collapsed: boolean;
    isLongText: boolean;
    maxHeight?: number;
}

export default class EmbedText extends PureComponent<Props, State> {
    static getDerivedStateFromProps(nextProps: Props, prevState: State) {
        const {deviceHeight} = nextProps;
        const maxHeight = Math.round((deviceHeight * 0.4) + SHOW_MORE_HEIGHT);

        if (maxHeight !== prevState.maxHeight) {
            return {
                maxHeight,
            };
        }

        return null;
    }

    constructor(props: Props) {
        super(props);

        this.state = {
            collapsed: true,
            isLongText: false,
        };
    }

    handleLayout = (event: LayoutChangeEvent) => {
        const {height} = event.nativeEvent.layout;
        const {maxHeight} = this.state;

        if (height >= (maxHeight || 0)) {
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
            <View>
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
                            baseTextStyle={baseTextStyle}
                            textStyles={textStyles}
                            blockStyles={blockStyles}
                            disableGallery={true}
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

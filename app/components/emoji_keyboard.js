// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity
} from 'react-native';
import {KeyboardRegistry} from 'react-native-keyboard-input';
import {store} from 'app/mattermost';
import {CategoryNames, EmojiIndicesByCategory, Emojis} from 'app/utils/emojis';
import Emoji from 'app/components/emoji/index';
import PropTypes from 'prop-types';

function buildCategory(category) {
    return {
        key: category,
        data: EmojiIndicesByCategory.get(category).map(
                (index) => Emojis[index].aliases[0])
    };
}
const emojiCategories = CategoryNames.map(buildCategory);

const EMOJI_SIZE = 32;
const EMOJI_PADDING = 4;

const styles = StyleSheet.create({
    category: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        alignContent: 'flex-end'
    },
    categoriesToolbar: {
        flex: 0,
        flexDirection: 'row'
    }
});

class EmojiKeyboard extends React.PureComponent {
    static propTypes = {
        containerBackgroundColor: PropTypes.string.isRequired
    }

    static emptyLayout = () => ({layout: {}})
    static emojiRange = [...(new Array(emojiCategories.length)).keys()]

    static getCategoryNameByIndex = (index) => {
        const nonNegativeIndex = Math.max(0, index);
        const bounded = Math.min(emojiCategories.length - 1, nonNegativeIndex);
        return emojiCategories[bounded].key;
    }

    state = {
        layout: EmojiKeyboard.emojiRange.map(EmojiKeyboard.emptyLayout),
        currentCategoryName: EmojiKeyboard.getCategoryNameByIndex(0)
    }

    onEmojiSelected = (emojiName) => {
        KeyboardRegistry.onItemSelected('EmojiKeyboard', {emojiName});
    }

    scrollToCategoryByIndex = (index) => {
        if (index === emojiCategories.length - 1) {
            this.categoryListRef.scrollToEnd();
        } else {
            this.categoryListRef.scrollToIndex({index});
        }
    }

    handleCategoryListRef = (ref) => {
        this.categoryListRef = ref;
    }

    renderEmoji = (item, index) => (
        <TouchableOpacity
            key={index}
            style={{padding: EMOJI_PADDING}}
            onPress={() => this.onEmojiSelected(item)}
        >
            <Emoji
                size={EMOJI_SIZE}
                store={store}
                key={item}
                emojiName={item}
            />
        </TouchableOpacity>
    )

    handleCategoryLayout = (index, layout) => {
        this.setState(
            {
                layout: [
                    ...this.state.layout.slice(0, index),
                    {layout},
                    ...this.state.layout.slice(index + 1, this.state.layout.length)
                ]
            }
        );
    }

    getCategoryLayout = (data, index) => {
        const categoryData = this.state.layout[index];
        const {layout} = categoryData;
        const {width = 0} = layout;
        return {
            length: width,
            offset: this.calculateCategoryOffset(index),
            index
        };
    }

    calculateCategoryOffset = (index) => {
        return this.state.layout.slice(0, index).reduce(
            (offset, {layout}) => offset + layout.width
            , 0
        );
    }

    getCategoryNameByIndex = (index) => {
        return EmojiKeyboard.getCategoryNameByIndex(index);
    }

    getCategoryNameByOffset = (offset, index = 0) => {
        if (offset < 0) {
            return this.getCategoryNameByIndex(index - 1);
        }
        const categoryData = this.state.layout[index];
        return this.getCategoryNameByOffset(
            offset - categoryData.layout.width,
            index + 1);
    }

    handleScroll = ({nativeEvent}) => {
        const currentScrollOffset = nativeEvent.contentOffset.x;
        const currentCategoryName = this.getCategoryNameByOffset(currentScrollOffset);
        this.setState({currentCategoryName});
    }

    renderCategory = ({item, index}) => {
        return (
            <View
                onLayout={
                    ({nativeEvent}) =>
                        this.handleCategoryLayout(index, nativeEvent.layout)
                }
                style={[styles.category, {position: 'relative'}]}
            >
                {item.data.map(this.renderEmoji)}
            </View>
        );
    }

    renderCategoryIcon = ({item, index}) => {
        return (
            <TouchableOpacity
                style={styles.categoryIcon}
                onPress={() => this.scrollToCategoryByIndex(index)}
            >
                <Text> {item.key} </Text>
            </TouchableOpacity>
        );
    }

    render() {
        const {containerBackgroundColor} = this.props;
        return (
            <View style={{flex: 1, backgroundColor: containerBackgroundColor}}>
                <View>
                    <Text>
                        {this.state.currentCategoryName}
                    </Text>
                </View>
                <FlatList
                    initialNumToRender={1}
                    getItemLayout={this.getCategoryLayout}
                    ref={this.handleCategoryListRef}
                    horizontal={true}
                    renderItem={this.renderCategory}
                    keyExtractor={(item, index) => JSON.stringify(index)}
                    data={emojiCategories}
                    showsHorizontalScrollIndicator={false}
                    onScroll={this.handleScroll}
                />
                <View style={styles.categoriesToolbar}>
                    <FlatList
                        horizontal={true}
                        renderItem={this.renderCategoryIcon}
                        keyExtractor={(item, index) => JSON.stringify(index)}
                        data={emojiCategories}
                        showsHorizontalScrollIndicator={false}
                    />
                </View>
            </View>
        );
    }
}

export default EmojiKeyboard;

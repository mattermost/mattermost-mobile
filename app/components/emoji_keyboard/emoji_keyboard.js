// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {KeyboardRegistry} from 'react-native-keyboard-input';

import {store} from 'app/mattermost';
import Emoji from 'app/components/emoji';
import {
    CategoryNames,
    EmojiIndicesByCategory,
    Emojis,
    CategoryIconsFontAwesome
} from 'app/utils/emojis';

const EMPTY_STRING = '';
const NUM_CATEGORIES = CategoryNames.length;

class EmojiKeyboard extends React.PureComponent {
    static propTypes = {
        containerBackgroundColor: PropTypes.string
    }
    static defaultProps = {
        containerBackgroundColor: 'white'
    }
    static EMOJI_SIZE = 32;
    static BASE_PADDING = 4;
    static CUSTOM_KEYBOARD_NAME = 'EmojiKeyboard';
    static emojiRange = [...(new Array(NUM_CATEGORIES)).keys()]
    static emojiCategories = CategoryNames.map((category) => (
        {
            key: category,
            data: EmojiIndicesByCategory.get(category).map(
                (index) => Emojis[index].aliases[0])
        }
    ));

    static getCategoryNameByIndex = (index) => {
        const nonNegativeIndex = Math.max(0, index);
        const limited = Math.min(NUM_CATEGORIES - 1, nonNegativeIndex);
        const category = EmojiKeyboard.emojiCategories[limited];
        if (category && category.key) {
            return category.key;
        }
        return EMPTY_STRING;
    }

    static getCategoryIconNameByIndex = (index) => {
        return CategoryIconsFontAwesome[index];
    }

    state = {
        layout: EmojiKeyboard.emojiRange.map(() => ({layout: {}})),
        currentCategoryName: EmojiKeyboard.getCategoryNameByIndex(0)
    }

    onEmojiSelected = (emojiName) => {
        KeyboardRegistry.onItemSelected(
            EmojiKeyboard.CUSTOM_KEYBOARD_NAME, {emojiName});
    }

    scrollToCategoryByIndex = (index) => {
        if (index === NUM_CATEGORIES - 1) {
            this.categoryListRef.scrollToEnd();
        } else {
            this.categoryListRef.scrollToIndex({index});
        }
    }

    handleCategoryListRef = (ref) => {
        this.categoryListRef = ref;
    }

    renderEmoji = (item) => (
        <TouchableOpacity
            key={item}
            style={{padding: EmojiKeyboard.BASE_PADDING}}
            onPress={() => this.onEmojiSelected(item)}
        >
            <Emoji
                size={EmojiKeyboard.EMOJI_SIZE}
                store={store}
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

    getCategoryNameByOffset = (offset, index = 0) => {
        if (offset < 0) {
            return EmojiKeyboard.getCategoryNameByIndex(index - 1);
        }
        const categoryData = this.state.layout[index];
        return this.getCategoryNameByOffset(
            offset - categoryData.layout.width,
            index + 1);
    }

    handleScroll = ({nativeEvent}) => {
        const currentScrollOffset = nativeEvent.contentOffset.x;
        const currentCategoryName = this.getCategoryNameByOffset(currentScrollOffset);
        if (this.state.currentCategoryName !== currentCategoryName) {
            this.setState({currentCategoryName});
        }
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

    renderCategoryIcon = (category, index) => {
        const iconName = EmojiKeyboard.getCategoryIconNameByIndex(index);
        const categoryName = EmojiKeyboard.getCategoryNameByIndex(index);
        const isActive = this.state.currentCategoryName === categoryName;
        const dynamicStyle = isActive ? styles.activeCategoryIcon : {};
        return (
            <TouchableOpacity
                onPress={() => this.scrollToCategoryByIndex(index)}
                style={[styles.categoryIcon, dynamicStyle]}
                key={category.key}
            >
                <Icon
                    color={'#BABABA'}
                    size={20}
                    name={iconName}
                />
            </TouchableOpacity>
        );
    }

    render() {
        const {containerBackgroundColor} = this.props;
        const {currentCategoryName} = this.state;
        const categoryNameToDisplay = currentCategoryName.toUpperCase();
        return (
            <View style={{flex: 1, backgroundColor: containerBackgroundColor}}>
                <View>
                    <Text style={styles.currentCategoryName}>
                        {categoryNameToDisplay}
                    </Text>
                </View>
                <FlatList
                    initialNumToRender={1}
                    getItemLayout={this.getCategoryLayout}
                    ref={this.handleCategoryListRef}
                    horizontal={true}
                    renderItem={this.renderCategory}
                    keyExtractor={(item, index) => JSON.stringify(index)}
                    data={EmojiKeyboard.emojiCategories}
                    showsHorizontalScrollIndicator={false}
                    onScroll={this.handleScroll}
                />
                <View style={styles.categoriesToolbar}>
                    {
                        EmojiKeyboard.emojiCategories.map(this.renderCategoryIcon)
                    }
                </View>
            </View>
        );
    }
}

const kbs = KeyboardRegistry.getAllKeyboards();
if (!kbs.hasOwnProperty(EmojiKeyboard.CUSTOM_KEYBOARD_NAME)) {
    KeyboardRegistry.registerKeyboard(
        EmojiKeyboard.CUSTOM_KEYBOARD_NAME, () => EmojiKeyboard);
}

export default EmojiKeyboard;

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
        flexDirection: 'row',
        paddingLeft: EmojiKeyboard.BASE_PADDING
    },
    categoryIcon: {
        margin: 4,
        borderRadius: 28,
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center'
    },
    activeCategoryIcon: {
        backgroundColor: 'rgba(0,0,0,0.0618)'
    },
    currentCategoryName: {
        color: '#BABABA',
        paddingTop: EmojiKeyboard.BASE_PADDING,
        paddingLeft: EmojiKeyboard.BASE_PADDING
    }
});

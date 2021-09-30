// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import Fuse from 'fuse.js';
import React, {PureComponent} from 'react';
import {IntlShape} from 'react-intl';
import {NativeScrollEvent, NativeSyntheticEvent} from 'react-native';
import sectionListGetItemLayout from 'react-native-section-list-get-item-layout';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {selectEmojisBySection} from '@actions/local/custom_emoji';
import {getCustomEmojis} from '@actions/remote/custom_emoji';
import {Device, Emoji} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {WithDatabaseArgs} from '@typings/database/database';
import SystemModel from '@typings/database/models/servers/system';
import {compareEmojis, isCustomEmojiEnabled} from '@utils/emoji/helpers';

import EmojiPickerBase from './components/emoji_picker_base';

export const EMOJI_SIZE = 30;
export const EMOJI_GUTTER = 7;
export const EMOJIS_PER_PAGE = 200;
export const SECTION_HEADER_HEIGHT = 28;
export const SECTION_MARGIN = 15;
export const SCROLL_VIEW_NATIVE_ID = 'emojiPicker';

function filterEmojiSearchInput(searchText: string) {
    return searchText.toLowerCase().replace(/^:|:$/g, '');
}

type EmojiPickerProps = {
    deviceWidth: number;
    intl: IntlShape;
    isLandscape: boolean;
    onEmojiPress: (emoji: string) => void;
    serverUrl: string;
    testID: string;
    theme: Theme;
}

type EmojiPickerState = {
    currentSectionIndex: number;
    customEmojiPage: number;
    emojiSectionIndexByOffset: number[];
    filteredEmojis: string[];
    jumpToSection: boolean;
    loadingMore: boolean;
    missingPages: boolean;
    renderableEmojis: RenderableEmojis[];
    searchTerm: string | undefined;
};

type ConnectedEmojiPickerProps = EmojiPickerProps & {
    database: Database;
    config: ClientConfig;
    emojis: string;
    emojisBySection: EmojiSection[];
}

class EmojiPicker extends PureComponent<ConnectedEmojiPickerProps, EmojiPickerState> {
    private fuse: Fuse<unknown> | null | undefined;
    private readonly customEmojisEnabled: boolean;
    private readonly sectionListGetItemLayout: any;
    private rebuildEmojis: boolean | undefined;
    private scrollToSectionTries: number;
    private searchBarRef: any;
    private searchTermTimeout: NodeJS.Timeout | undefined;
    private sectionListRef: any;
    private readonly styles: any;

    constructor(props: ConnectedEmojiPickerProps) {
        super(props);

        this.sectionListGetItemLayout = sectionListGetItemLayout({
            getItemHeight: () => (EMOJI_SIZE + 7) + (EMOJI_GUTTER * 2),
            getSectionHeaderHeight: () => SECTION_HEADER_HEIGHT,
        });

        const {config} = props;

        this.customEmojisEnabled = isCustomEmojiEnabled(config);
        this.scrollToSectionTries = 0;
        this.state = {
            currentSectionIndex: 0,
            customEmojiPage: 0,
            emojiSectionIndexByOffset: [],
            filteredEmojis: [],
            jumpToSection: false, // fixme : should it be false or null
            loadingMore: false,
            missingPages: true,
            renderableEmojis: [],
            searchTerm: undefined,
        };
    }

    async componentDidMount() {
        await this.setUp();
    }

    setUp = async () => {
        const {serverUrl, deviceWidth} = this.props;

        const {emoticons: emojisBySection, emojis} = await selectEmojisBySection(serverUrl);
        this.fuse = await this.getFuseInstance(emojis ?? []);

        if (emojisBySection) {
            const renderableEmojis = this.renderableEmojis(emojisBySection, deviceWidth);
            const emojiSectionIndexByOffset = this.measureEmojiSections(renderableEmojis);

            this.setState({
                renderableEmojis,
                emojiSectionIndexByOffset,
            });
        }
    }

    getFuseInstance = async (emojis: string[]) => {
        const options = {findAllMatches: true, ignoreLocation: true, includeMatches: true, shouldSort: false};

        if (emojis) {
            const list = emojis.length ? emojis : [];
            return new Fuse(list, options);
        }

        return null;
    }

    componentDidUpdate(prevProps: EmojiPickerProps) {
        this.rebuildEmojis = false;
        if (this.props.deviceWidth !== prevProps.deviceWidth) {
            this.rebuildEmojis = true;

            if (this.searchBarRef) {
                this.searchBarRef.blur();
            }
        }

        //fixme:  rework this componentDidUpdate
        // if (this.props.emojis !== prevProps.emojis) {
        //     this.rebuildEmojis = true;
        // }

        this.setRebuiltEmojis();
    }

    setSearchBarRef = (ref: any) => {
        this.searchBarRef = ref;
    };

    setSectionListRef = (ref: any) => {
        this.sectionListRef = ref;
    };

    setRebuiltEmojis = (searchBarAnimationComplete = true) => {
        const {emojisBySection, deviceWidth} = this.props;
        if (this.rebuildEmojis && searchBarAnimationComplete) {
            this.rebuildEmojis = false;
            const renderableEmojis = this.renderableEmojis(emojisBySection, deviceWidth);
            this.setState({renderableEmojis});
        }
    };

    renderableEmojis = (emojis: EmojiSection[], deviceWidth: number): RenderableEmojis[] => {
        const numberOfColumns = this.getNumberOfColumns(deviceWidth);

        const nextEmojis = emojis.map((section) => {
            const data = [];
            let row = {key: `${section.key}-0`, items: [] as EmojiAlias[]};

            section.data.forEach((emoji, index) => {
                if (index % numberOfColumns === 0 && index !== 0) {
                    data.push(row);
                    row = {
                        key: `${section.key}-${index}`,
                        items: [],
                    };
                }

                row.items.push(emoji);
            });

            if (row.items.length) {
                if (row.items.length < numberOfColumns) {
                    // push some empty items to make sure flexbox can justify content correctly
                    const emptyEmojis = new Array(
                        numberOfColumns - row.items.length,
                    );
                    row.items.push(...emptyEmojis);
                }

                data.push(row);
            }

            return {
                ...section,
                data,
            };
        });

        return nextEmojis;
    };

    measureEmojiSections = (emojiSections: RenderableEmojis[]): number[] => {
        let lastOffset = 0;
        return emojiSections.map((section) => {
            const start = lastOffset;
            const nextOffset = (section.data.length * ((EMOJI_SIZE + 7) + (EMOJI_GUTTER * 2))) + SECTION_HEADER_HEIGHT;
            lastOffset += nextOffset;

            return start;
        });
    };

    changeSearchTerm = (rawText: string) => {
        const {searchTerm: prevSearchTerm} = this.state;

        const searchTerm = filterEmojiSearchInput(rawText);
        const nextState = {searchTerm: rawText};
        this.setState(nextState);

        if (!searchTerm) {
            return;
        }

        if (this.searchTermTimeout) {
            clearTimeout(this.searchTermTimeout);
        }

        if (prevSearchTerm === '') {
            const filteredEmojis = this.searchEmojis(searchTerm);
            this.setState({
                filteredEmojis,
            });
        } else {
            this.searchTermTimeout = setTimeout(() => {
                const filteredEmojis = this.searchEmojis(searchTerm);
                this.setState({
                    filteredEmojis,
                });
            }, 100);
        }
    };

    cancelSearch = () => {
        this.setState({
            currentSectionIndex: 0,
            filteredEmojis: [],
            searchTerm: undefined,
        });
    };

    searchEmojis = (searchTerm: string): string[] => {
        const searchTermLowerCase = searchTerm.toLowerCase();

        if (!searchTerm) {
            return [];
        }

        const sorter = (a: string, b: string) => {
            return compareEmojis(a, b, searchTermLowerCase);
        };

        const fuzz = this.fuse?.search(searchTermLowerCase);

        if (fuzz) {
            const results = fuzz.reduce((values, r) => {
                const v = r?.matches?.[0]?.value;
                if (v) {
                    values.push(v);
                }

                return values;
            }, [] as string[]);

            const data = results.sort(sorter);

            return data;
        }

        return [];
    };

    getNumberOfColumns = (deviceWidth: number) => {
        const {isLandscape} = this.props;
        const shorten = Device.IS_IPHONE_WITH_INSETS && isLandscape ? 4 : 2;
        return Math.floor(Number(((deviceWidth - (SECTION_MARGIN * shorten)) / ((EMOJI_SIZE + 7) + (EMOJI_GUTTER * shorten)))));
    };

    onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const {currentSectionIndex, emojiSectionIndexByOffset, jumpToSection} = this.state;

        if (jumpToSection) {
            return;
        }

        const {contentOffset} = e.nativeEvent;
        let nextIndex = emojiSectionIndexByOffset.findIndex(
            (offset) => contentOffset.y <= offset,
        );

        if (nextIndex === -1) {
            nextIndex = emojiSectionIndexByOffset.length - 1;
        } else if (nextIndex !== 0) {
            nextIndex -= 1;
        }

        if (nextIndex !== currentSectionIndex) {
            this.setState({
                currentSectionIndex: nextIndex,
            });
        }
    };

    onMomentumScrollEnd = () => {
        const {jumpToSection} = this.state;
        if (jumpToSection) {
            this.setState({
                jumpToSection: false,
            });
        }
    };

    scrollToSection = (index: number) => {
        this.setState({jumpToSection: true, currentSectionIndex: index},
            () => {
                this.sectionListRef.scrollToLocation({sectionIndex: index, itemIndex: 0, viewOffset: 25});
            },
        );
    };

    handleScrollToSectionFailed = ({index}: {index: number}) => {
        if (this.scrollToSectionTries < 1) {
            const sfTimeout = setTimeout(() => {
                this.scrollToSectionTries++;
                this.scrollToSection(index);
                clearTimeout(sfTimeout);
            }, 200);
        }
    };

    handleSectionIconPress = (index: number, isCustomSection = false) => {
        const {customEmojiPage} = this.state;

        this.scrollToSectionTries = 0;
        this.scrollToSection(index);

        if (isCustomSection && customEmojiPage === 0) {
            this.loadMoreCustomEmojis();
        }
    };

    loadMoreCustomEmojis = async () => {
        const {serverUrl} = this.props;
        const {customEmojiPage} = this.state;
        if (!this.customEmojisEnabled) {
            return;
        }

        const {data} = await getCustomEmojis({serverUrl, page: customEmojiPage, perPage: EMOJIS_PER_PAGE, loadUsers: true});

        this.setState({loadingMore: false});

        if (!data) {
            return;
        }

        if (data.length < EMOJIS_PER_PAGE) {
            this.setState({missingPages: false});
        }

        this.setState((prevState) => ({
            customEmojiPage: prevState.customEmojiPage + 1,
        }));
    };

    render() {
        const {currentSectionIndex, renderableEmojis, filteredEmojis, missingPages, searchTerm} = this.state;
        const {deviceWidth, onEmojiPress, testID, theme} = this.props;

        return (
            <EmojiPickerBase
                currentSectionIndex={currentSectionIndex}
                deviceWidth={deviceWidth}
                emojis={renderableEmojis}
                filteredEmojis={filteredEmojis}
                itemLayout={this.sectionListGetItemLayout}
                missingPages={missingPages}
                onAnimationComplete={this.setRebuiltEmojis}
                onCancelSearch={this.cancelSearch}
                onChangeSearchTerm={this.changeSearchTerm}
                onEmojiPress={onEmojiPress}
                onHandleScrollToSectionFailed={this.handleScrollToSectionFailed}
                onHandleSectionIconPress={this.handleSectionIconPress}
                onLoadMoreCustomEmojis={this.loadMoreCustomEmojis}
                onMomentumScrollEnd={this.onMomentumScrollEnd}
                onScroll={this.onScroll}
                onSetSearchBarRef={this.setSearchBarRef}
                onSetSectionListRef={this.setSectionListRef}
                searchTerm={searchTerm}
                testID={testID}
                theme={theme}
            />
        );
    }
}

const withConfig = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        config: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap((cfg: SystemModel) => of$(cfg.value))),
    };
});

const ConnectedEmojiPicker: React.FC<EmojiPickerProps> = withDatabase(withConfig(EmojiPicker));

export default ConnectedEmojiPicker;

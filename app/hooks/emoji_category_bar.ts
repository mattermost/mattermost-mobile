// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

export type EmojiCategoryBarIcon = {
    key: string;
    icon: string;
}

type EmojiCategoryBar = {
    currentIndex: number;
    selectedIndex?: number;
    icons?: EmojiCategoryBarIcon[];
    skinTone: string;
};

const defaultState: EmojiCategoryBar = {
    icons: undefined,
    currentIndex: 0,
    selectedIndex: undefined,
    skinTone: 'default',
};

const subject: BehaviorSubject<EmojiCategoryBar> = new BehaviorSubject(defaultState);

const getEmojiCategoryBarState = () => {
    return subject.value;
};

export const selectEmojiCategoryBarSection = (index?: number) => {
    const prevState = getEmojiCategoryBarState();
    subject.next({
        ...prevState,
        selectedIndex: index,
    });
};

export const setEmojiCategoryBarSection = (index: number) => {
    const prevState = getEmojiCategoryBarState();
    subject.next({
        ...prevState,
        currentIndex: index,
    });
};

export const setEmojiCategoryBarIcons = (icons?: EmojiCategoryBarIcon[]) => {
    const prevState = getEmojiCategoryBarState();
    subject.next({
        ...prevState,
        icons,
    });
};

export const setEmojiSkinTone = (skinTone: string) => {
    const prevState = getEmojiCategoryBarState();
    subject.next({
        ...prevState,
        skinTone,
    });
};

export const useEmojiCategoryBar = () => {
    const [state, setState] = useState(defaultState);

    useEffect(() => {
        const sub = subject.subscribe(setState);

        return () => {
            sub.unsubscribe();
            subject.next(defaultState);
        };
    }, []);

    return state;
};

export const useEmojiSkinTone = () => {
    const [tone, setTone] = useState(defaultState.skinTone);

    useEffect(() => {
        const sub = subject.subscribe((state) => {
            setTone(state.skinTone);
        });

        return () => {
            sub.unsubscribe();
        };
    }, []);

    return tone;
};

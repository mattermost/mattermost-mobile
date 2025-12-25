// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class EmojiPickerSingleton {
    private emojiPickerCallback: ((emoji: string) => void) | null = null;

    public setEmojiPickerCallback(callback: (emoji: string) => void) {
        this.emojiPickerCallback = callback;
    }

    public getEmojiPickerCallback() {
        return this.emojiPickerCallback;
    }

    public clearEmojiPickerCallback() {
        this.emojiPickerCallback = null;
    }
}

const EmojiPickerStore = new EmojiPickerSingleton();
export default EmojiPickerStore;

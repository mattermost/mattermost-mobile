// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isArrayOf} from './types';

export function getStatusColors(theme: Theme): Dictionary<string> {
    return {
        good: '#00c100',
        warning: '#dede01',
        danger: theme.errorTextColor,
        default: theme.centerChannelColor,
        primary: theme.buttonBg,
        success: theme.onlineIndicator,
    };
}

export function isMessageAttachmentArray(v: unknown): v is MessageAttachment[] {
    return isArrayOf(v, isMessageAttachment);
}

export function isPostActionOption(v: unknown): v is PostActionOption {
    if (typeof v !== 'object' || !v) {
        return false;
    }

    if ('text' in v && typeof v.text !== 'string') {
        return false;
    }

    if ('value' in v && typeof v.value !== 'string') {
        return false;
    }

    return true;
}

function isPostAction(v: unknown): v is PostAction {
    if (typeof v !== 'object' || !v) {
        return false;
    }

    if ('id' in v && typeof v.id !== 'string') {
        return false;
    }

    if ('name' in v && typeof v.name !== 'string') {
        return false;
    }

    if ('type' in v && typeof v.type !== 'string') {
        return false;
    }

    if ('disabled' in v && typeof v.disabled !== 'boolean') {
        return false;
    }

    if ('style' in v && typeof v.style !== 'string') {
        return false;
    }

    if ('data_source' in v && typeof v.data_source !== 'string') {
        return false;
    }

    if ('options' in v && !isArrayOf(v.options, isPostActionOption)) {
        return false;
    }

    if ('default_option' in v && typeof v.default_option !== 'string') {
        return false;
    }

    if ('cookie' in v && typeof v.cookie !== 'string') {
        return false;
    }

    return true;
}

function isMessageAttachmentField(v: unknown): v is MessageAttachmentField {
    if (typeof v !== 'object') {
        return false;
    }

    if (!v) {
        return false;
    }

    if ('title' in v && typeof v.title !== 'string') {
        return false;
    }

    if ('value' in v && typeof v.value === 'object' && v.value && 'toString' in v.value && typeof v.value.toString !== 'function') {
        return false;
    }

    if ('short' in v && typeof v.short !== 'boolean') {
        return false;
    }

    return true;
}

function isMessageAttachment(v: unknown): v is MessageAttachment {
    if (typeof v !== 'object' || !v) {
        return false;
    }

    if ('fallback' in v && typeof v.fallback !== 'string') {
        return false;
    }

    // We may consider adding more validation to what color may be
    if ('color' in v && typeof v.color !== 'string') {
        return false;
    }

    if ('pretext' in v && typeof v.pretext !== 'string') {
        return false;
    }

    if ('author_name' in v && typeof v.author_name !== 'string') {
        return false;
    }

    // Where it is used, we are calling isUrlSafe. We could consider calling it here
    if ('author_link' in v && typeof v.author_link !== 'string') {
        return false;
    }

    // We may need more validation since this is going to be passed to an img src prop
    if ('author_icon' in v && typeof v.author_icon !== 'string') {
        return false;
    }

    if ('title' in v && typeof v.title !== 'string') {
        return false;
    }

    // Where it is used, we are calling isUrlSafe. We could consider calling it here
    if ('title_link' in v && typeof v.title_link !== 'string') {
        return false;
    }

    if ('text' in v && typeof v.text !== 'string') {
        return false;
    }

    // We may need more validation since this is going to be passed to an img src prop
    if ('image_url' in v && typeof v.image_url !== 'string') {
        return false;
    }

    // We may need more validation since this is going to be passed to an img src prop
    if ('thumb_url' in v && typeof v.thumb_url !== 'string') {
        return false;
    }

    // We are truncating if the size is more than some constant. We could check this here
    if ('footer' in v && typeof v.footer !== 'string') {
        return false;
    }

    // We may need more validation since this is going to be passed to an img src prop
    if ('footer_icon' in v && typeof v.footer_icon !== 'string') {
        return false;
    }

    if ('fields' in v && v.fields !== null && !isArrayOf(v.fields, isMessageAttachmentField)) {
        return false;
    }

    if ('actions' in v && !isArrayOf(v.actions, isPostAction)) {
        return false;
    }

    return true;
}

export function filterOptions(options: PostActionOption[] | undefined) {
    return options?.reduce((acc: DialogOption[], option) => {
        let optionText = option.text;
        let optionValue = option.value;

        if (optionText && !optionValue) {
            optionValue = optionText;
        } else if (optionValue && !optionText) {
            optionText = optionValue;
        }

        if (optionText && optionValue) {
            acc.push({text: optionText, value: optionValue});
        }
        return acc;
    }, []);
}

export const testExports = {
    isMessageAttachment,
    isMessageAttachmentField,
    isPostAction,
    isPostActionOption,
};

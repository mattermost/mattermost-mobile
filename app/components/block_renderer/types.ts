// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {MmBlocksFormValues} from './form';

/**
 * `attachmentCookie` is the legacy attachment cookie when the block was translated from `props.attachments`.
 * `formValues` are typed form input values (`text_input`/`select`/etc.), sent for `submit`
 * buttons and for `onChange`-triggered refresh actions on input blocks.
 * `subtype` is the button subtype (`execute` | `submit`); omitted for non-button actions.
 */
export type ActionHandlerParams = {
    actionId: string;
    selectedOption?: string;
    query?: Record<string, string>;
    attachmentCookie?: string;
    formValues?: MmBlocksFormValues;
    subtype?: MmButtonSubtype;
};

export type ActionHandler = (params: ActionHandlerParams) => void | Promise<void>;

/** Dynamic-select lookup (form `select` blocks with `data_source: 'dynamic'`). */
export type LookupHandler = (
    actionId: string,
    userInput: string,
    formValues?: MmBlocksFormValues,
) => Promise<Array<{text: string; value: string}>>;

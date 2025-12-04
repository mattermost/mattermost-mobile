// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type Model from '@nozbe/watermelondb/Model';

/**
 * The PlaybookRunAttribute interface, which will have all the fields from the PLAYBOOK_RUN_ATTRIBUTE table
 */
interface PlaybookRunAttributeModelInterface extends Model {

    /** groupId : The group ID of the field */
    groupId: string;

    /** name : The name of the field */
    name: string;

    /** type : The type of the field */
    type: string;

    /** targetId : The target ID of the field */
    targetId: string;

    /** targetType : The target type of the field */
    targetType: string;

    /** createAt : The timestamp of when the field was created */
    createAt: number;

    /** updateAt : The timestamp of when the field was last updated */
    updateAt: number;

    /** deleteAt : The timestamp of when the field was deleted */
    deleteAt: number;

    /** attrs : Additional attributes for the field (JSON string) */
    attrs?: string;
}

export type {PlaybookRunAttributeModelInterface as default};

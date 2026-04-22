// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

declare class ViewModel extends Model {
    static table: string;
    static associations: Associations;

    /** channel_id : The channel this view belongs to */
    channelId: string;

    /** type : The view type (e.g. 'kanban') */
    type: ViewType;

    /** creator_id : The user that created this view */
    creatorId: string;

    /** title : The view title */
    title: string;

    /** description : Optional view description */
    description: string | null;

    /** sort_order : The ordering position of this view within the channel */
    sortOrder: number;

    /** props : Free-form view props */
    props: Record<string, unknown> | null;

    /** create_at : The timestamp when this view was created */
    createAt: number;

    /** update_at : The timestamp when this view was last updated */
    updateAt: number;

    /** delete_at : The timestamp when this view was deleted (0 if not deleted) */
    deleteAt: number;
}

export default ViewModel;

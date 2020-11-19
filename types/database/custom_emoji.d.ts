import { Model } from '@nozbe/watermelondb';
export default class CustomEmoji extends Model {
    static table: string;
    emojiId: string;
    name: string;
}

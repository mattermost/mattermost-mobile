import Foundation

public struct PostResponse: Codable {
    let order: [String]
    let posts: [String:Post]
    let nextPostId: String
    let prevPostId: String
    
    public enum PostResponseKeys: String, CodingKey {
        case order, posts
        case nextPostId = "next_post_id"
        case prevPostId = "prev_post_id"
    }
    
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: PostResponseKeys.self)
        order = values.decodeIfPresent(forKey: .order, defaultValue: [String]())
        nextPostId = values.decodeIfPresent(forKey: .nextPostId, defaultValue: "")
        prevPostId = values.decodeIfPresent(forKey: .prevPostId, defaultValue: "")
        posts = (try? values.decode([String:Post].self, forKey: .posts)) ?? [String:Post]()
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: PostResponseKeys.self)
        try container.encode(self.order, forKey: .order)
        try container.encode(self.posts, forKey: .posts)
        try container.encode(self.nextPostId, forKey: .nextPostId)
        try container.encode(self.prevPostId, forKey: .prevPostId)
    }
}

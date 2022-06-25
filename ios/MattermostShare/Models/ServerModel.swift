//
//  Server.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 20-06-22.
//

import Foundation

struct ServerModel: Identifiable, Codable, Hashable {
  var id: String
  var displayName: String
  var url: String
  
  enum ServerKeys: String, CodingKey {
    case id, url
    case displayName = "display_name"
  }
  
  init(id: String, displayName: String, url: String) {
    self.id = id
    self.displayName = displayName
    self.url = url
  }
  
  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: ServerKeys.self)
    id = try container.decode(String.self, forKey: .id)
    displayName = try container.decode(String.self, forKey: .displayName)
    url = try container.decode(String.self, forKey: .url)
  }
}

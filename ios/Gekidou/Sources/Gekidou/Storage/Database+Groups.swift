//
//  File.swift
//  
//
//  Created by Shaz MJ on 9/7/2022.
//

import Foundation
import SQLite

public struct Group: Codeable, Hashable {
    let id: String
    let name: String
    let display_name: String
    let description: String
    let source: String
    let remote_id: String
    let member_count: Int64
    let allow_reference: Bool
    let create_at: Int64
    let update_at: Int64
    let delete_at: Int64
}

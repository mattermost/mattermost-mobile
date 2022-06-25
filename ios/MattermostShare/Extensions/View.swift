//
//  View.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 22-06-22.
//

import Foundation
import SwiftUI

extension View {
    func placeholder<Content: View>(when shouldShow: Bool, alignment: Alignment = .leading, @ViewBuilder placeholder: () -> Content) -> some View {
        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
        }
    }
}

//
//  FloatingTextField.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 20-06-22.
//

import SwiftUI

struct FloatingTextField: View {
    private let placeholderText: String
    @State private var isEditing = false
    @Binding var text: String
    
    public init(placeholderText: String, text: Binding<String>) {
        self._text = text
        self.placeholderText = placeholderText
    }
    
    var shouldPlaceholderMove: Bool {
        isEditing || text.count != 0
    }
    
    var body: some View {
        ZStack(alignment: .topLeading) {
            TextEditor(text: $text)
                .accentColor(.accentColor)
                .padding(.horizontal, 10)
                .font(Font.custom("OpenSans", size: 16))
                .foregroundColor(Color.theme.centerChannelColor)
                .lineLimit(10)
                .multilineTextAlignment(.leading)
                .frame(maxHeight: 104, alignment: .leading)
                .onTapGesture {
                    isEditing = true
                }
                .onChange(of: text) { newValue in
                    isEditing = !newValue.isEmpty
                }
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(shouldPlaceholderMove ?
                                    Color.theme.linkColor :
                                    Color.theme.centerChannelColor.opacity(0.64),
                            lineWidth: 1)
                )
            Text(placeholderText)
                .foregroundColor(
                    shouldPlaceholderMove ?
                        Color.theme.linkColor :
                        Color.theme.centerChannelColor.opacity(0.64)

                )
                .font(
                    Font.custom("OpenSans", size: shouldPlaceholderMove ? 10 : 16))
                .padding(
                    shouldPlaceholderMove ?
                        EdgeInsets(top: 0, leading: 5, bottom: 0, trailing: 5) :
                        EdgeInsets(top: 8, leading: 15, bottom: 0, trailing: 0)
                )
                .background(Color(UIColor.systemBackground).opacity(shouldPlaceholderMove ? 1.0 : 0))
                .offset(x: shouldPlaceholderMove ? 10 : 0, y: shouldPlaceholderMove ? -8 : 0)
                .animation(.easeInOut(duration: 0.2), value: shouldPlaceholderMove)
        }
    }
}

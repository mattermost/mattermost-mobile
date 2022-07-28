//
//  LinkPreview.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI
import OpenGraph

struct OpenGraphData {
  var title: String?
  var link: String
  var type: String?
  var siteName: String?
  var description: String?
  var imageURL: String?
  var error: Error?
}

struct LinkPreview: View {
  @Binding var link: String
  @Binding var message: String
  @State private var data: OpenGraphData = OpenGraphData(link: "")
  
  var body: some View {
    let borderColor = Color.theme.centerChannelColor.opacity(0.16)
    VStack {
      if (data.error == nil) {
        ZStack {
          HStack (alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
              Text(data.title ?? "")
                .foregroundColor(Color.theme.linkColor)
                .multilineTextAlignment(.leading)
                .lineLimit(2)
                .font(Font.custom("OpenSans-SemiBold", size: 16))
              
              Text(verbatim: data.link)
                .foregroundColor(Color.theme.centerChannelColor.opacity(0.64))
                .multilineTextAlignment(.leading)
                .lineLimit(2)
                .font(Font.custom("OpenSans", size: 12))
            }
            Spacer()
            if (data.imageURL != nil) {
              VStack {
                AsyncImage(url: URL(string: data.imageURL!)) { phase in
                  if let image = phase.image {
                    image
                      .resizable()
                      .scaledToFill()
                      .frame(width: 72, height: 72)
                  } else if phase.error != nil {
                    FontIcon.text(
                      .compassIcons(code: .brokenImage),
                      fontsize: 24
                    )
                  } else {
                    ProgressView()
                  }
                }
                .cornerRadius(4)
                .frame(width: 72, height: 72)
                .background(
                  RoundedRectangle(cornerRadius: 4)
                    .stroke(borderColor, lineWidth: 1)
                )
              }
            }
          }
          .padding(.horizontal, 10)
        }
        .frame(minWidth: 0,
               maxWidth: .infinity,
               minHeight: 0,
               maxHeight: 96,
               alignment: .leading)
        .background(
          RoundedRectangle(cornerRadius: 4)
            .stroke(borderColor, lineWidth: 1)
            .shadow(color: borderColor, radius: 3, x: 0, y: 2)
        )
      }
    }
    .task (id: link) {
      await fetchData()
    }
  }
  
  private func fetchData() async {
    do {
      guard let url = URL(string: link) else {return}
      
      let openGraph = try await OpenGraph.fetch(url: url)
      var imageUrl = openGraph[.image];
      if (imageUrl != nil) {
        var comps = URLComponents(string: imageUrl!)!
        comps.scheme = "https"
        imageUrl = comps.string
      }
      let data = OpenGraphData(
        title: openGraph[.title],
        link: openGraph[.url] ?? link,
        type: openGraph[.type],
        siteName: openGraph[.siteName],
        description: openGraph[.description],
        imageURL: imageUrl,
        error: nil
      )
      self.data = data
    } catch {
      self.data.error = error
      message = link
      link = ""
    }
  }
}

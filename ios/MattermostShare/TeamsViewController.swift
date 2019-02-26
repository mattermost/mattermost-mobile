import UIKit

class TeamsViewController: UIViewController {
  
  lazy var tableView: UITableView = {
    let tableView = UITableView(frame: self.view.frame)
    tableView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    tableView.dataSource = self
    tableView.delegate = self
    tableView.backgroundColor = .clear
    tableView.register(UITableViewCell.self, forCellReuseIdentifier: Identifiers.TeamCell)
    return tableView
  }()
  var teamDecks = [Item]()
  weak var delegate: TeamsViewControllerDelegate?
  
  override func viewDidLoad() {
    super.viewDidLoad()
    
    title = "Teams"
    view.addSubview(tableView)
  }
  
}

private extension TeamsViewController {
  struct Identifiers {
    static let TeamCell = "teamCell"
  }
}

extension TeamsViewController: UITableViewDataSource {
  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return teamDecks.count
  }
  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: Identifiers.TeamCell, for: indexPath)
    cell.textLabel?.text = teamDecks[indexPath.row].title
    if teamDecks[indexPath.row].selected {
      cell.accessoryType = .checkmark
    } else {
      cell.accessoryType = .none
    }
    cell.backgroundColor = .clear
    return cell
  }
}

protocol TeamsViewControllerDelegate: class {
  func selectedTeam(deck: Item)
}

extension TeamsViewController: UITableViewDelegate {
  func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    delegate?.selectedTeam(deck: teamDecks[indexPath.row])
  }
}

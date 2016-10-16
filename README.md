# Mattermost Mobile

This project is the Mattermost mobile client from [https://mattermost.org](https://mattermost.org).

It's written in JavaScript using React Native.

##Development

ENV variables are stored in `secrets/config.json`.  To get started you need to copy the `secrets_example/` directory to `secrets/`.  On a mac this command would be:
- `cp -r secrets_example/ secrets/`

If you are working with a team, you can manage this directory using submodules. To setup a submodules for the secrets directory here is what you need to do:

- First you will need to create a repository that will hold your secrets.  Once you have your repository holding your secrets, create a `config.json` file in the root.  This should look similar to the one provided in `secrets_example/config.json` in this repo.  Push your secrets repository up to your git host.  Get the ssh url from your repository, navigate back to this repository and run the following.
- `git rm -rf secrets & rm -rf .git/modules/secrets & rm -rf secrets`
  - This will remove the secrets directory and will also remove any leftover git references if any.  You can also use this command to completely wipe the submodule if you want to go back to manually managing the `config.json`.
- `git submodule add -f git@<host>.com:<username>/<repo_name>.git`
  - This will pull the contents of the secrets repository into this repository and initiate git tracking for this submodule.
- `git submodule foreach git pull origin master`
  - When a change is added to the secrets repository that needs to be distributed to the team and CI/CD, you can run this command to pull down the recent changes to the secrets directory in this repo.

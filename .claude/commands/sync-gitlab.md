Push the current branch to the internal GitLab remote.

Run: `git push gitlab main`

If it fails with a timeout, remind the user to turn on Netbird first.
If it fails with authentication error, remind the user the PAT may have expired and they should update it at https://git.devlord.io.vn/-/user_settings/personal_access_tokens.

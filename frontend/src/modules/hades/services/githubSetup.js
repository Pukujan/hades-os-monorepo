export function buildGitHubOAuthUrl(clientId = "your-client-id", scope = "repo") {
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}`;
}

export function formatGitHubAppName(name) {
  if (!name) return "GitHub App";
  return name;
}

export function buildGitHubSetupCommand(username) {
  const appName = username ? `hades-github-app-${username}` : "hades-github-app";
  return appName;
}

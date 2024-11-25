import dotEnvConfig from "dotenv";

const envConfig = dotEnvConfig.config({});

export const getGithubToken = () => {
  const token = envConfig?.parsed?.GITHUB_TOKEN || envConfig?.parsed?.GH_TOKEN;

  if (!token) {
    throw new Error("No github token found");
  }

  return token ?? "";
};

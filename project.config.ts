export interface ProjectConfig {
  // Basic information
  title: string
  tagline: string
  description: string

  // Project owner information
  author: {
    name: string
    email?: string
    website?: string
  }

  // GitHub repository information (project code repo)
  github: {
    username: string
    repoName: string
  }

  // Docs/website repository information
  docsGithub: {
    username: string
    repoName: string
  }

  // Website deployment information
  deployment: {
    url: string
    baseUrl: string
  }

  // Social links
  social?: {
    twitter?: string
    discord?: string
    linkedin?: string
  }

}

const projectConfig: ProjectConfig = {
  // Basic project information
  title: 'Agentic AI',
  tagline: 'Agentic AI Runtime for Java Developers. Build ReAct agents, graph workflows, and multi-agent applications with durable execution.',
  description: 'Agentic AI 是面向 Java 开发者的智能体运行时与工作流框架，提供 ReAct Agent、Graph 编排、上下文工程、持久化执行和人机协同能力。',

  // Project owner information
  author: {
    name: 'Agentic AI',
    website: 'https://agentic-spring-ai.github.io/website/',
  },

  // GitHub repository information (project code repo)
  github: {
    username: 'agentic-spring-ai',
    repoName: 'agentic-spring-ai',
  },

  // Docs/website repository information
  docsGithub: {
    username: 'agentic-spring-ai',
    repoName: 'website',
  },

  // Website deployment configuration
  deployment: {
    url: 'https://agentic-spring-ai.github.io',
    baseUrl: '/website/', // 项目站点部署在 GitHub Pages 的仓库子路径下
  },

}

// Export configuration and helper functions
export default projectConfig

// Helper function: generate GitHub related links
export const getGitHubUrls = (config: ProjectConfig) => {
  const { username, repoName } = config.github
  const baseUrl = `https://github.com/${username}/${repoName}`

  const { username: docsUsername, repoName: docsRepoName } = config.docsGithub
  const docsBaseUrl = `https://github.com/${docsUsername}/${docsRepoName}`

  return {
    repo: baseUrl,
    discussions: `${baseUrl}/discussions`,
    issues: `${baseUrl}/issues`,
    license: `${baseUrl}/blob/main/LICENSE`,
    contributing: `${baseUrl}/blob/main/CONTRIBUTING.md`,
    editDocs: `${docsBaseUrl}/tree/main/`,
    docsRepo: docsBaseUrl,
  }
}

// Helper function: generate complete author information
export const getAuthorInfo = (config: ProjectConfig) => {
  const { name, email, website } = config.author
  return {
    name,
    email,
    full: [name, email ? `<${email}>` : undefined, website ? `(${website})` : undefined]
      .filter(Boolean)
      .join(' '),
  }
}

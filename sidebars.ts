import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'overview',
    'quick-start',
  ],
  reactAgentSidebar: [
    'frameworks/agent-framework/quick-start',
  ],
  graphCoreSidebar: [
    'frameworks/graph-core/quick-start',
  ],
  studioSidebar: [
    'frameworks/studio/quick-start',
  ],
  communitySidebar: [
    'community/policies',
  ],
}

export default sidebars

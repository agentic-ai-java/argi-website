# Agentic AI Documentation Website

The official documentation website for the Agentic AI project, built with Docusaurus.

## Quick Start

Ensure npm is installed locally. Then run `make install && make preview`.

## Starting in Chinese or English

Default (Chinese): `make preview`
English: `make preview-en`

## Build and Serve

`make build && make serve`

## GitHub Pages Deployment

After the publishing branch is updated, GitHub Actions publishes the `build` directory once lint and build checks pass. Before the first deployment, set the publishing source to `GitHub Actions` under `Settings > Pages`. The site is available at <https://agentic-spring-ai.github.io/website/>.

## Before Committing

Before committing, run `make npm-lint && make markdown` to ensure the GitHub CI passes successfully.
(PS: You may need to install CI tools. Run `make help` to view fix commands and install formatting tools.)

## Useful Tips

1. Docusaurus Markdown features - use them appropriately to make documentation structure better and more readable: https://docusaurus.io/docs/markdown-features/react
2. `make pangu-lint f=${file path}`: Automatically adds Pangu spacing for clearer and more readable document formatting
3. Chinese documentation writing guide: https://github.com/stars/yuluo-yx/lists/docs

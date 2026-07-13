#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createMcpServerFromRoot } from './mcp-server-factory.mjs';

const { server, manifests, allTools } = await createMcpServerFromRoot();

if (process.argv.includes('--self-test')) {
  console.log(
    JSON.stringify(
      {
        status: 'success',
        sdkCount: manifests.length,
        toolCount: allTools.length,
        sampleTools: allTools.slice(0, 6).map((tool) => tool.name)
      },
      null,
      2
    )
  );
  process.exit(0);
}

const transport = new StdioServerTransport();
await server.connect(transport);

import fs from 'node:fs/promises';
import path from 'node:path';

const MCP_ENDPOINT = 'https://aicenturies.com/mcp';
const TARGET_DIR = path.resolve('clones/aicentury');

async function callMcp(name, args = {}) {
  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now() + Math.floor(Math.random() * 1000),
      method: 'tools/call',
      params: { name, arguments: args }
    })
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`MCP Error ${data.error.code}: ${data.error.message}`);
  }
  const text = data.result?.content?.[0]?.text;
  if (!text) {
    return data.result?.structuredContent || data.result;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`[Clone] Starting complete clone of AI Century Agent Library...`);
  await fs.mkdir(TARGET_DIR, { recursive: true });

  // 1. Fetch all agents
  console.log(`[Clone] Fetching agent list...`);
  const page1 = await callMcp('ac_list_agents', { limit: 50 });
  const page2 = await callMcp('ac_list_agents', { limit: 50, cursor: page1.next_cursor });
  const allAgents = [...page1.agents, ...page2.agents];
  console.log(`[Clone] Found ${allAgents.length} total agents.`);

  const catalog = [];

  for (let i = 0; i < allAgents.length; i++) {
    const agent = allAgents[i];
    const agentSlug = slugify(agent.name);
    const agentDirName = `${agent.id.toUpperCase()}_${agentSlug}`;
    const agentDir = path.join(TARGET_DIR, 'agents', agentDirName);
    await fs.mkdir(agentDir, { recursive: true });

    console.log(`[Clone] (${i + 1}/${allAgents.length}) Scraping ${agent.id}: ${agent.name}...`);

    try {
      // Get detail
      const detail = await callMcp('ac_get_agent', { agent_id: agent.id });
      // Get instructions & reference material
      const start = await callMcp('ac_start_agent', { agent_id: agent.id });

      const metadata = {
        id: agent.id,
        name: agent.name,
        category: agent.category,
        category_slug: agent.category_slug,
        summary: agent.summary,
        version: agent.version,
        steps: agent.steps,
        knowledge_docs_count: agent.knowledge_docs,
        icon: agent.icon,
        use_when: detail.use_when || '',
        produces: detail.produces || '',
        step_titles: detail.step_titles || [],
        kind: detail.kind || 'instructions',
        scraped_at: new Date().toISOString()
      };

      await fs.writeFile(
        path.join(agentDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2),
        'utf8'
      );

      // Save instruction
      const instruction = start.step?.instruction || '';
      await fs.writeFile(path.join(agentDir, 'instruction.md'), instruction, 'utf8');

      // Save reference documents if any
      const refDocs = start.reference_material || [];
      if (refDocs.length > 0) {
        const refDir = path.join(agentDir, 'references');
        await fs.mkdir(refDir, { recursive: true });
        for (let j = 0; j < refDocs.length; j++) {
          const doc = refDocs[j];
          let safeTitle = slugify(doc.title || `doc_${j + 1}`);
          if (safeTitle.length > 60) safeTitle = safeTitle.slice(0, 60);
          const docPath = path.join(refDir, `${safeTitle}.md`);
          await fs.writeFile(docPath, `# ${doc.title}\n\n${doc.content || ''}`, 'utf8');
        }
      }

      catalog.push({
        ...metadata,
        dir: agentDirName,
        reference_files_count: refDocs.length
      });

      // Polite pause to prevent 429 rate limiting
      await sleep(150);
    } catch (err) {
      console.error(`[Clone] Error scraping ${agent.id}: ${err.message}`);
    }
  }

  // Save master catalog
  await fs.writeFile(
    path.join(TARGET_DIR, 'catalog.json'),
    JSON.stringify(catalog, null, 2),
    'utf8'
  );

  console.log(`[Clone] Successfully scraped ${catalog.length} agents into ${TARGET_DIR}!`);
}

main().catch(console.error);

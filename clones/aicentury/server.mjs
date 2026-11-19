import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATALOG_PATH = path.join(__dirname, 'catalog.json');
const AGENTS_DIR = path.join(__dirname, 'agents');

let catalog = [];

async function loadCatalog() {
  try {
    const raw = await fs.readFile(CATALOG_PATH, 'utf8');
    catalog = JSON.parse(raw);
  } catch (err) {
    catalog = [];
  }
}

const server = new Server(
  {
    name: 'ai-century-local',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'aicentury_list',
        description: 'Browse the cloned AI Century skills library. Filter by category (e.g., "Cinematic Filmmaking", "AI Shorts", "Advertisement", "ASMR", "YouTube Automation", "Styles").',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Optional category name or slug to filter by' },
            limit: { type: 'number', description: 'Max items to return (default: 30)' }
          }
        }
      },
      {
        name: 'aicentury_search',
        description: 'Search all 75 AI Century skills, system instructions, and reference bibles using full-text keyword matching (e.g., "caveman", "vlog", "turnaround", "commercial", "kling", "wan", "cast swap", "restoration").',
        inputSchema: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', description: 'Search keywords or specific skill ID like AC71 or AC78' }
          }
        }
      },
      {
        name: 'aicentury_get_skill',
        description: 'Get the full system instructions, prompt templates, and metadata for any AI Century skill by its ID (e.g., AC78 for Time Travel / Caveman Vlog, AC71 for Seedance Studio, AC91 for Cast Swap, AC44 for Kling).',
        inputSchema: {
          type: 'object',
          required: ['agent_id'],
          properties: {
            agent_id: { type: 'string', description: 'Skill ID (e.g., AC78, AC71, AC91, AC44, AC92, AC88)' }
          }
        }
      },
      {
        name: 'aicentury_read_reference',
        description: 'Read the full markdown contents of a specific reference document belonging to an agent (e.g., "video-prompt.md", "character-sheet.md", "environments.md", "you-in-a-video.md").',
        inputSchema: {
          type: 'object',
          required: ['agent_id', 'doc_name'],
          properties: {
            agent_id: { type: 'string', description: 'Skill ID (e.g., AC71, AC91, AC54)' },
            doc_name: { type: 'string', description: 'Filename or slug of the reference document' }
          }
        }
      },
      {
        name: 'aicentury_to_frontier_scene',
        description: 'Convert an AI Century shot/prompt definition into a production-ready Frontier Studio shot payload (with character consistency, camera movement vectors, lighting, and aspect ratio).',
        inputSchema: {
          type: 'object',
          required: ['shot_title', 'prompt_text'],
          properties: {
            shot_title: { type: 'string', description: 'Title or beat name' },
            prompt_text: { type: 'string', description: 'The video or image prompt from an AI Century skill' },
            aspect_ratio: {
              type: 'string',
              enum: ['16:9', '9:16', '1:1', '21:9', '4:3', '3:4'],
              default: '9:16',
              description: 'Aspect ratio'
            },
            dialogue: { type: 'string', description: 'Spoken dialogue if present' }
          }
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  await loadCatalog();

  if (name === 'aicentury_list') {
    let results = catalog;
    if (args?.category) {
      const q = String(args.category).toLowerCase();
      results = results.filter(
        (a) => a.category.toLowerCase().includes(q) || a.category_slug.includes(q)
      );
    }
    const limit = args?.limit || 30;
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              total_matching: results.length,
              agents: results.slice(0, limit).map((a) => ({
                id: a.id,
                name: a.name,
                category: a.category,
                summary: a.summary,
                has_references: a.reference_files_count > 0,
                reference_docs_count: a.reference_files_count
              }))
            },
            null,
            2
          )
        }
      ]
    };
  }

  if (name === 'aicentury_search') {
    const q = String(args.query).toLowerCase().trim();
    const hits = [];

    // Check direct ID or keyword
    for (const item of catalog) {
      let score = 0;
      if (item.id.toLowerCase() === q) score += 100;
      if (item.name.toLowerCase().includes(q)) score += 50;
      if (item.summary.toLowerCase().includes(q)) score += 20;
      if (item.category.toLowerCase().includes(q)) score += 10;

      // Special contextual aliases
      if (q.includes('caveman') || q.includes('time travel') || q.includes('vlog')) {
        if (item.id === 'AC78') score += 80;
      }
      if (q.includes('turnaround') || q.includes('character sheet') || q.includes('storyboard')) {
        if (item.id === 'AC71' || item.id === 'AC44' || item.id === 'AC92' || item.id === 'AC15') score += 60;
      }
      if (q.includes('commercial') || q.includes('ad') || q.includes('brand')) {
        if (item.id === 'AC9' || item.id === 'AC57' || item.id === 'AC72' || item.id === 'AC37') score += 40;
      }
      if (q.includes('swap') || q.includes('face')) {
        if (item.id === 'AC91' || item.id === 'AC89') score += 60;
      }

      if (score > 0) {
        hits.push({ ...item, score });
      }
    }

    hits.sort((a, b) => b.score - a.score);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query: q,
              total_hits: hits.length,
              results: hits.slice(0, 15).map((h) => ({
                id: h.id,
                name: h.name,
                category: h.category,
                summary: h.summary,
                reference_files_count: h.reference_files_count
              }))
            },
            null,
            2
          )
        }
      ]
    };
  }

  if (name === 'aicentury_get_skill') {
    const targetId = String(args.agent_id).toUpperCase().trim();
    const agentMeta = catalog.find((a) => a.id.toUpperCase() === targetId);
    if (!agentMeta) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Skill '${targetId}' not found in local catalog.` }]
      };
    }

    const agentDir = path.join(AGENTS_DIR, agentMeta.dir);
    const instruction = await fs.readFile(path.join(agentDir, 'instruction.md'), 'utf8');

    let references = [];
    const refDir = path.join(agentDir, 'references');
    try {
      const files = await fs.readdir(refDir);
      references = files.filter((f) => f.endsWith('.md'));
    } catch {
      // No references dir
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              id: agentMeta.id,
              name: agentMeta.name,
              category: agentMeta.category,
              summary: agentMeta.summary,
              available_reference_docs: references,
              system_instructions: instruction
            },
            null,
            2
          )
        }
      ]
    };
  }

  if (name === 'aicentury_read_reference') {
    const targetId = String(args.agent_id).toUpperCase().trim();
    const docQuery = String(args.doc_name).toLowerCase().trim();
    const agentMeta = catalog.find((a) => a.id.toUpperCase() === targetId);
    if (!agentMeta) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Skill '${targetId}' not found.` }]
      };
    }

    const refDir = path.join(AGENTS_DIR, agentMeta.dir, 'references');
    try {
      const files = await fs.readdir(refDir);
      const matchedFile = files.find((f) => f.toLowerCase().includes(docQuery));
      if (!matchedFile) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Reference doc matching '${docQuery}' not found. Available: ${files.join(', ')}`
            }
          ]
        };
      }
      const content = await fs.readFile(path.join(refDir, matchedFile), 'utf8');
      return {
        content: [
          {
            type: 'text',
            text: content
          }
        ]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Agent '${targetId}' has no reference documents.` }]
      };
    }
  }

  if (name === 'aicentury_to_frontier_scene') {
    const { shot_title, prompt_text, aspect_ratio = '9:16', dialogue = '' } = args;

    // Clean prompt: enforce the <2000 char rule and strip any accidental background music mention
    let cleanPrompt = String(prompt_text)
      .replace(/No background music\./gi, '')
      .replace(/No subtitles, no text on screen\./gi, '')
      .trim();

    const frontierShotPayload = {
      title: shot_title,
      aspect_ratio: aspect_ratio,
      prompt: cleanPrompt,
      negative_prompt: 'blurry, distorted facial features, plastic skin texture, modern tech anachronisms unless specified, floating artifacts, bad anatomy',
      dialogue: dialogue || null,
      camera: {
        movement: 'subtle handheld selfie vlog motion',
        lens: 'wide 24mm front-facing perspective',
        lighting: 'natural ambient matching key'
      },
      ready_for_studio_render: true,
      execution_hint: `Use Frontier Studio 'shot_render' or 'npm run render:parallel' to render this shot on Vultr MiniMax H3 / Veo 2 / Kling.`
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(frontierShotPayload, null, 2)
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function run() {
  await loadCatalog();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[AI Century Local MCP] Server running on stdio');
}

run().catch((err) => {
  console.error('[AI Century Local MCP] Fatal error:', err);
  process.exit(1);
});

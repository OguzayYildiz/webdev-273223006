const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { tools: projectTools, createProjectTools } = require('./project-tools');
const project = createProjectTools();

const input = readline.createInterface({ input: process.stdin });
const tools = [
  {
    name: 'find_lecture',
    description: 'Use when asked what a numbered lecture covers; return its title and topics.',
    inputSchema: {
      type: 'object',
      properties: { number: { type: 'integer', description: 'Lecture number from 1 to 12' } },
      required: ['number']
    }
  },
  {
    name: 'list_lectures',
    description: 'List the available course lectures with their numbers and titles.',
    inputSchema: { type: 'object', properties: {} }
  }
];

// These functions contain the data work, separate from the protocol messages.
function readLectures() {
  const file = path.join(__dirname, 'lectures.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function findLecture(number) {
  return readLectures().find((lecture) => lecture.number === number);
}

function listLectures() {
  return readLectures().map((lecture) => lecture.number + ': ' + lecture.title).join('\n');
}

function sendResult(id, result) {
  console.log(JSON.stringify({ jsonrpc: '2.0', id: id, result: result }));
}

function sendError(id, code, message) {
  console.log(JSON.stringify({ jsonrpc: '2.0', id: id, error: { code: code, message: message } }));
}

input.on('line', async (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch (error) {
    sendError(null, -32700, 'Invalid JSON');
    return;
  }

  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    sendError(null, -32600, 'Invalid request');
    return;
  }
  console.error(typeof message.method === 'string' ? 'MCP request received' : 'Invalid MCP method');

  // Notifications have no id, so they do not get a reply.
  if (message.id === undefined) return;

  if (message.method === 'initialize') {
    sendResult(message.id, {
      protocolVersion: message.params && message.params.protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: 'course-lectures', version: '0.1.0' }
    });
  } else if (message.method === 'tools/list') {
    sendResult(message.id, { tools: [...tools, ...projectTools] });
  } else if (message.method === 'tools/call') {
    const params = message.params || {};
    const args = params.arguments || {};
    if (params.name === 'find_lecture') {
      const lecture = findLecture(args.number);
      let text;
      let isError = false;
      if (lecture) {
        text = 'Lecture ' + lecture.number + ': ' + lecture.title + '. Topics: ' + lecture.topics;
      } else {
        text = 'There is no lecture ' + args.number + '. The course has lectures 1 to 12.';
        isError = true;
      }
      sendResult(message.id, { content: [{ type: 'text', text: text }], isError: isError });
    } else if (params.name === 'list_lectures') {
      sendResult(message.id, { content: [{ type: 'text', text: listLectures() }], isError: false });
    } else if (projectTools.some((tool) => tool.name === params.name)) {
      sendResult(message.id, await project.call(params.name, args));
    } else {
      sendError(message.id, -32602, 'Unknown tool: ' + params.name);
    }
  } else {
    sendError(message.id, -32601, 'Unknown method: ' + message.method);
  }
});

input.on('close', () => project.close().catch(() => console.error('Could not close project storage.')));

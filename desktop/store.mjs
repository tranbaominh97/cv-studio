import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { parseMarkdown, serializeCV } from './markdown.mjs';
import { letterFields, letterMarker } from '../src/features/cv-editor/coverLetter.js';
import { defaultLayout, validateAppearance } from '../src/features/cv-editor/templates.js';

export { defaultLayout };

export function validFilename(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 180 ||
      /[<>:"/\\|?*\x00-\x1f]/.test(value) || /[. ]$/.test(value) ||
      /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(value)) {
    throw new Error('Tên CV không hợp lệ. Không dùng dấu /, \\, : hoặc ký tự đặc biệt.');
  }
  return value.endsWith('.md') ? value : `${value}.md`;
}

export function validateDocument(data, layout) {
  const string = value => typeof value === 'string' && value.length <= 100000;
  if (data?.type === 'cover-letter') {
    if (!letterFields.every(key => string(data[key]))) throw new Error('Dữ liệu Cover Letter không hợp lệ.');
  } else {
    if (!data || !['name', 'contact', 'summary'].every(key => string(data[key])) ||
        !data.sections || Array.isArray(data.sections) || typeof data.sections !== 'object') {
      throw new Error('Dữ liệu CV không hợp lệ.');
    }
    for (const [key, items] of Object.entries(data.sections)) {
      if (!Array.isArray(items) || !string(key)) throw new Error('Mục CV không hợp lệ.');
      for (const item of items) {
        const fields = key === 'WORK EXPERIENCE' ? ['role', 'company', 'dateRange', 'location'] :
          key === 'EDUCATION' ? ['degree', 'school', 'dateRange'] :
          ['SKILLS', 'LANGUAGES'].includes(key) ? ['category', 'details'] : null;
        if (fields ? !item || !fields.every(field => string(item[field])) : !string(item)) {
          throw new Error('Nội dung mục CV không hợp lệ.');
        }
        if (key === 'WORK EXPERIENCE' && (!Array.isArray(item.bullets) || !item.bullets.every(string))) {
          throw new Error('Danh sách nội dung công việc không hợp lệ.');
        }
      }
    }
  }
  const ranges = { fontSize: [9, 16], lineHeight: [1.1, 1.8], sectionGap: [3, 20], margin: [6, 20] };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (!Number.isFinite(layout?.[key]) || layout[key] < min || layout[key] > max) {
      throw new Error('Thiết lập trang nằm ngoài giới hạn.');
    }
  }
  validateAppearance(layout);
}

async function atomicWrite(file, text) {
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temp, text, { flag: 'wx' });
    await fs.rename(temp, file);
  } finally {
    await fs.rm(temp, { force: true });
  }
}

export function createStore(directory) {
  const root = path.resolve(directory);
  const metadata = path.join(root, '.cv-studio');
  let queue = Promise.resolve();
  const revision = (raw, layout) => createHash('sha256').update(raw + JSON.stringify(layout)).digest('hex');
  const filePath = name => path.join(root, validFilename(name));
  async function load(name) {
    const raw = await fs.readFile(filePath(name), 'utf8');
    let layout = { ...defaultLayout };
    try {
      layout = { ...layout, ...JSON.parse(await fs.readFile(path.join(metadata, `${validFilename(name)}.json`), 'utf8')) };
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Không đọc được thiết lập trang đã lưu.');
    }
    const data = parseMarkdown(raw);
    validateDocument(data, layout);
    return { data, layout, revision: revision(raw, layout) };
  }
  function save(name, data, layout, expectedRevision, create = false) {
    const task = queue.catch(() => {}).then(async () => {
      validateDocument(data, layout);
      const target = filePath(name);
      await fs.mkdir(root, { recursive: true });
      await fs.mkdir(metadata, { recursive: true });
      if (!create) {
        const current = await load(name);
        if (current.revision !== expectedRevision) {
          throw new Error('CV đã được sửa bên ngoài app. Hãy lưu thành bản sao hoặc nạp lại bản từ Codex.');
        }
        const backupDir = path.join(metadata, 'originals');
        await fs.mkdir(backupDir, { recursive: true });
        try {
          await fs.copyFile(target, path.join(backupDir, validFilename(name)), 1);
        } catch (error) {
          if (error.code !== 'EEXIST') throw error;
        }
      }
      const raw = serializeCV(data);
      if (create) {
        try { await fs.writeFile(target, raw, { flag: 'wx' }); }
        catch (error) {
          if (error.code === 'EEXIST') throw new Error('Tên CV này đã có. Hãy chọn tên khác.');
          throw error;
        }
      } else {
        await atomicWrite(target, raw);
      }
      await atomicWrite(path.join(metadata, `${validFilename(name)}.json`), JSON.stringify(layout));
      return { revision: revision(raw, layout) };
    });
    queue = task;
    return task;
  }
  return {
    root, load, save,
    async list(kind = 'cv') {
      if (!['cv', 'cover-letter'].includes(kind)) throw new Error('Loại tài liệu không hợp lệ.');
      await fs.mkdir(root, { recursive: true });
      const entries = await fs.readdir(root, { withFileTypes: true });
      const files = entries.filter(entry => entry.isFile() && entry.name.endsWith('.md'));
      const matching = await Promise.all(files.map(async entry => {
        const raw = await fs.readFile(path.join(root, entry.name), 'utf8');
        return raw.startsWith(letterMarker) === (kind === 'cover-letter') ? entry.name : null;
      }));
      return matching.filter(Boolean).sort((a, b) => a.localeCompare(b));
    },
  };
}

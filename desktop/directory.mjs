import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function resolveDataDirectory(userData, legacyDirectory) {
  const settings = path.join(userData, 'settings.json');
  try {
    const config = JSON.parse(await fs.readFile(settings, 'utf8'));
    if (typeof config.directory !== 'string' || !path.isAbsolute(config.directory)) {
      throw new Error('Thư mục hồ sơ đã lưu không hợp lệ.');
    }
    return config.directory;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }

  let directory = path.join(userData, 'data', 'cvs');
  // Keep existing portable CVs in place and remember their absolute location.
  try {
    const files = await fs.readdir(legacyDirectory, { withFileTypes: true });
    if (files.some(file => file.isFile() && file.name.endsWith('.md'))) directory = legacyDirectory;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.mkdir(userData, { recursive: true });
  await fs.writeFile(settings, JSON.stringify({ directory }), { flag: 'wx' });
  return directory;
}

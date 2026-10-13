import { parseMarkdown, serializeCV } from './desktop/markdown.mjs';
import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname);
const CVS_DIR = path.join(ROOT_DIR, 'data', 'cvs');

// Helper to ensure data/cvs exists and contains at least one cv.md
async function ensureCvsDir() {
  await fs.mkdir(CVS_DIR, { recursive: true });
  const files = await fs.readdir(CVS_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  if (mdFiles.length === 0) {
    // If empty, look for fallback cv.md
    const fallbackPath = path.join(ROOT_DIR, 'cv.md');
    try {
      await fs.access(fallbackPath);
      await fs.copyFile(fallbackPath, path.join(CVS_DIR, 'cv.md'));
      console.log('📝 Copied main cv.md to data/cvs/cv.md');
    } catch (err) {
      // Create default empty CV
      await fs.writeFile(
        path.join(CVS_DIR, 'cv.md'),
        '# Example Person\nExample City • person@example.com\n\nJob Title\n\n---\n\n## WORK EXPERIENCE\n',
        'utf-8'
      );
    }
  }
}

const app = express();
app.use(cors());
app.use(express.json());

async function parseCV(cvPath) {
  return parseMarkdown(await fs.promises.readFile(cvPath, 'utf-8'));
}

// API: List all CV files
app.get('/api/cvs', async (req, res) => {
  try {
    await ensureCvsDir();
    const files = await fs.readdir(CVS_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    res.json(mdFiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get CV
app.get('/api/cv', async (req, res) => {
  try {
    await ensureCvsDir();
    const filename = req.query.file || 'cv.md';
    const filePath = path.join(CVS_DIR, filename);
    const data = await parseCV(filePath);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Save CV
app.post('/api/cv', async (req, res) => {
  try {
    const filename = req.query.file || 'cv.md';
    const filePath = path.join(CVS_DIR, filename);
    const markdown = serializeCV(req.body);
    await fs.writeFile(filePath, markdown, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Generate PDF
app.post('/api/pdf', async (req, res) => {
  try {
    const cvData = req.body;
    
    const boldMarkdown = (text) => {
      if (!text) return '';
      return String(text).replace(/\*\/(.*?)\*\//g, '<strong>$1</strong>')
                         .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    };
    
    const templatePath = path.join(ROOT_DIR, 'templates', 'cv-template.html');
    let html = await fs.readFile(templatePath, 'utf-8');
    
    let competenciesHTML = '';
    if (cvData.competencies && cvData.competencies.length > 0) {
      competenciesHTML = `
      <div class="section">
        <div class="section-title">Core Competencies</div>
        <div class="competencies-grid">
          ${cvData.competencies.map(comp => `<span class="competency-tag">${boldMarkdown(comp)}</span>`).join('\n        ')}
        </div>
      </div>`;
    }

    const experienceHTML = cvData.sections['WORK EXPERIENCE'].map(job => {
      let bulletsHtml = [];
      let inList = false;
      
      job.bullets.forEach(b => {
        const isItalicIntro = (b.startsWith('*') && b.endsWith('*') && !b.startsWith('**')) ||
                             (b.startsWith('_') && b.endsWith('_'));
        if (isItalicIntro) {
          if (inList) {
            bulletsHtml.push('      </ul>');
            inList = false;
          }
          const cleanText = b.slice(1, -1);
          bulletsHtml.push(`      <p class="job-description"><em>${boldMarkdown(cleanText)}</em></p>`);
        } else {
          if (!inList) {
            bulletsHtml.push('      <ul>');
            inList = true;
          }
          bulletsHtml.push(`        <li>${boldMarkdown(b)}</li>`);
        }
      });
      
      if (inList) {
        bulletsHtml.push('      </ul>');
      }

      return `
    <div class="job">
      <div class="job-header">
        <span class="job-role">${boldMarkdown(job.role)}</span>
        <span class="job-period">${boldMarkdown(job.dateRange)}</span>
      </div>
      <div class="job-header">
        <span class="job-company">${boldMarkdown(job.company)}</span>
        <span class="job-location">${boldMarkdown(job.location)}</span>
      </div>
${bulletsHtml.join('\n')}
    </div>`;
    }).join('\n    ');

    const educationHTML = cvData.sections['EDUCATION'].map(edu => `
    <div class="edu-item">
      <div class="edu-header">
        <span class="edu-title">${boldMarkdown(edu.degree)}</span>
        <span class="edu-year">${boldMarkdown(edu.dateRange)}</span>
      </div>
      <div class="edu-org">${boldMarkdown(edu.school)}</div>
    </div>`).join('\n    ');

    let skillsHTML = '';
    const visibleSkills = (cvData.sections['SKILLS'] || []).filter(
      skill => skill.category?.trim() || skill.details?.trim()
    );
    if (visibleSkills.length > 0) {
      skillsHTML = `
      <div class="section">
        <div class="section-title">Skills</div>
        <div class="skills-grid">
          ${visibleSkills.map(s => `
          <div class="skill-item">
            <span class="skill-category">${s.category ? boldMarkdown(s.category) + ':' : ''}</span> ${boldMarkdown(s.details)}
          </div>`).join('')}
        </div>
      </div>`;
    }

    const competenciesKey = Object.keys(cvData.sections).find(
      key => key.toUpperCase().includes('COMPETENC')
    );
    if (competenciesKey && cvData.sections[competenciesKey].length > 0) {
      skillsHTML += `
      <div class="section">
        <div class="section-title">${competenciesKey}</div>
        <div class="skills-grid">
          ${cvData.sections[competenciesKey].map(item => `
          <div class="skill-item">${boldMarkdown(item.replace(/^[-*+]\s*/, ''))}</div>`).join('')}
        </div>
      </div>`;
    }

    if (cvData.sections['LANGUAGES & TOOLS']?.length > 0) {
      skillsHTML += `
      <div class="section">
        <div class="section-title">Languages & Tools</div>
        <div class="skills-grid">
          ${cvData.sections['LANGUAGES & TOOLS'].map(item => `
          <div class="skill-item">${boldMarkdown(item)}</div>`).join('')}
        </div>
      </div>`;
    }

    let projectsHTML = '';
    const awardsKey = Object.keys(cvData.sections).find(k => k.toUpperCase().includes('AWARD') || k.toUpperCase().includes('ACCOMPLISHMENT'));
    const projectsKey = Object.keys(cvData.sections).find(k => k.toUpperCase().includes('PROJECT'));
    const activeProjectsKey = awardsKey || projectsKey;
    if (activeProjectsKey) {
      const items = cvData.sections[activeProjectsKey];
      const listHtml = [];
      let inList = false;
      items.forEach(item => {
        const line = item.trim();
        if (line.startsWith('### ')) {
          if (inList) { listHtml.push('</ul>'); inList = false; }
          listHtml.push(`<div class="award-title">${boldMarkdown(line.replace('### ', ''))}</div>`);
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          if (!inList) { listHtml.push('<ul>'); inList = true; }
          listHtml.push(`<li>${boldMarkdown(line.replace(/^[-*]\s*/, ''))}</li>`);
        } else if (line) {
          if (inList) { listHtml.push('</ul>'); inList = false; }
          listHtml.push(`<p>${boldMarkdown(line)}</p>`);
        }
      });
      if (inList) listHtml.push('</ul>');
      projectsHTML = `
      <div class="section">
        <div class="section-title">${activeProjectsKey}</div>
        <div class="award-item">${listHtml.join('\n')}</div>
      </div>`;
    }

    let certificationsHTML = '';
    const certsKey = Object.keys(cvData.sections).find(k => k.toUpperCase().includes('CERTIF'));
    if (certsKey && cvData.sections[certsKey].length > 0) {
      const items = cvData.sections[certsKey];
      const listHtml = [];
      let inList = false;
      items.forEach(item => {
        const line = item.trim();
        if (line.startsWith('- ') || line.startsWith('* ')) {
          if (!inList) { listHtml.push('<ul>'); inList = true; }
          listHtml.push(`<li>${boldMarkdown(line.replace(/^[-*]\s*/, ''))}</li>`);
        } else if (line) {
          if (inList) { listHtml.push('</ul>'); inList = false; }
          listHtml.push(`<p>${boldMarkdown(line)}</p>`);
        }
      });
      if (inList) listHtml.push('</ul>');
      certificationsHTML = `
      <div class="section">
        <div class="section-title">${certsKey}</div>
        <div class="cert-table">${listHtml.join('\n')}</div>
      </div>`;
    }

    html = html.replaceAll('{{LANG}}', 'en');
    html = html.replaceAll('{{PAGE_WIDTH}}', '210mm');
    html = html.replaceAll('{{NAME}}', cvData.name);
    html = html.replaceAll('{{CONTACT}}', cvData.contact);
    html = html.replaceAll('{{SECTION_SUMMARY}}', 'Professional Summary');
    const summaryLines = (cvData.summary || '').split('\n').map(l => l.trim()).filter(Boolean);
    const summaryTitle = summaryLines[0] || '';
    const summaryBody = summaryLines.slice(1).join(' ').trim();
    const summaryHTML = [
      summaryTitle ? `<p class="summary-title">${boldMarkdown(summaryTitle)}</p>` : '',
      summaryBody ? `<p class="summary-body">${boldMarkdown(summaryBody)}</p>` : ''
    ].filter(Boolean).join('\n');
    html = html.replaceAll('{{SUMMARY_TEXT}}', summaryHTML);
    html = html.replaceAll('{{COMPETENCIES}}', competenciesHTML);
    html = html.replaceAll('{{SECTION_EXPERIENCE}}', 'Work Experience');
    html = html.replaceAll('{{EXPERIENCE}}', experienceHTML);
    html = html.replaceAll('{{PROJECTS}}', projectsHTML);
    html = html.replaceAll('{{SECTION_EDUCATION}}', 'Education');
    html = html.replaceAll('{{EDUCATION}}', educationHTML);
    html = html.replaceAll('{{CERTIFICATIONS}}', certificationsHTML);
    html = html.replaceAll('{{SKILLS}}', skillsHTML);

    const tempHtmlPath = path.join(ROOT_DIR, 'output', 'cv-compiled-temp.html');
    await fs.writeFile(tempHtmlPath, html, 'utf-8');

    const normalizedName = cvData.name.toLowerCase().replace(/\s+/g, '-');
    const pdfPath = path.join(ROOT_DIR, `cv-${normalizedName}.pdf`);
    
    const cmd = `node "${path.join(ROOT_DIR, 'generate-pdf.mjs')}" "${tempHtmlPath}" "${pdfPath}" --format=a4`;
    console.log(`Executing: ${cmd}`);
    await execAsync(cmd);
    
    res.json({
      success: true,
      pdfPath: `/output/cv-${normalizedName}.pdf`,
      filename: `cv-${normalizedName}.pdf`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('/output/cv-*.pdf', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(ROOT_DIR, filename);
  res.sendFile(filePath);
});
app.use('/output', express.static(path.join(ROOT_DIR, 'output')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    await ensureCvsDir();
  } catch (err) {
    console.error('❌ Failed to initialize CV directory:', err.message);
  }
  console.log(`🚀 CV Builder backend running at http://localhost:${PORT}`);
});

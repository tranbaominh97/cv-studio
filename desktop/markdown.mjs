import { letterFields, letterMarker } from '../src/features/cv-editor/coverLetter.js';

// Letter fields keep paragraph breaks and Markdown emphasis intact.
export function parseCoverLetter(content) {
  const parts = content.replace(/\r\n/g, '\n').split(/^## ([A-Z]+)\n/gm);
  const data = { type: 'cover-letter' };
  for (const key of letterFields) data[key] = '';
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].toLowerCase();
    if (!letterFields.includes(key)) throw new Error('Mục Cover Letter không hợp lệ.');
    data[key] = parts[i + 1].replace(/\n\n$/, '').replace(/^\\(\\|## )/gm, '$1');
  }
  return data;
}

// Helper: Parse markdown CV into structured JSON
export function parseMarkdown(content) {
  if (content.startsWith(letterMarker)) return parseCoverLetter(content);
  const lines = content.split('\n');

  let name = '';
  let contact = '';
  let summary = '';
  let sections = {};
  let currentSection = null;
  let currentJob = null;
  let isHeader = true;
  let headerLines = [];

  const SECTION_NAMES = ['WORK EXPERIENCE', 'EDUCATION', 'SKILLS', 'LANGUAGES', 'AWARDS', 'ACCOMPLISHMENTS', 'PROJECTS'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect section headers
    let sectionDetected = false;
    let detectedName = '';
    if (line.startsWith('## ')) {
      sectionDetected = true;
      detectedName = line.replace('## ', '').trim().toUpperCase();
    } else if (line.startsWith('**') && line.endsWith('**')) {
      const cleanLine = line.replace(/\*\*/g, '').trim().toUpperCase();
      if (SECTION_NAMES.includes(cleanLine)) {
        sectionDetected = true;
        detectedName = cleanLine;
      }
    }

    if (sectionDetected) {
      isHeader = false;
      currentSection = detectedName;
      sections[currentSection] = [];
      currentJob = null;
      continue;
    }

    if (line.startsWith('---')) {
      isHeader = false;
      continue;
    }

    if (isHeader) {
      if (line.startsWith('# ')) {
        name = line.replace('# ', '').trim();
      } else if (!contact && (line.includes('•') || line.includes('|') || line.includes('@') || line.includes('+'))) {
        contact = line;
      } else {
        headerLines.push(line);
      }
      continue;
    }

    if (!currentSection) {
      headerLines.push(line);
      continue;
    }

    // Parse within sections
    if (currentSection === 'WORK EXPERIENCE' || currentSection === 'EXPERIENCE') {
      let isJobHeader = false;
      let role = '';
      let company = '';
      let dateRange = '';
      let location = '';

      if (line.startsWith('### ')) {
        isJobHeader = true;
        const text = line.replace('### ', '').trim();
        // Split only on en-dash (–) or em-dash (—), not regular hyphen (-)
        const parts = text.split(/\s*[—–]\s*/);
        if (parts.length >= 2) {
          role = parts.slice(0, -1).join(' — ');
          company = parts[parts.length - 1];
        } else {
          role = parts[0] || '';
          company = '';
        }
      } else if (line.startsWith('**') && line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 2) {
          isJobHeader = true;
          role = parts[0].replace(/\*\*/g, '').replace(/\*/g, '').trim();
          company = parts[1].replace(/\*\*/g, '').replace(/\*/g, '').trim();
        }
      }

      if (isJobHeader) {
        currentJob = { role, company, dateRange: '', location: '', bullets: [] };
        sections[currentSection].push(currentJob);

        // Look ahead for date and location
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) {
          j++;
        }
        if (j < lines.length) {
          const nextLine = lines[j].trim();
          if (nextLine.startsWith('**') && nextLine.endsWith('**') && !nextLine.includes('|*')) {
            const meta = nextLine.replace(/\*\*/g, '').trim();
            const parts = meta.split('|').map(p => p.trim());
            
            const isDateRange = (str) => {
              const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|\b\d{4}\b)/i;
              return datePattern.test(str);
            };

            if (parts.length === 3) {
              const dateIdx = parts.findIndex(isDateRange);
              if (dateIdx === 1) {
                if (currentJob.company && currentJob.company !== parts[0]) {
                  currentJob.role = `${currentJob.role} — ${currentJob.company}`;
                }
                currentJob.company = parts[0];
                currentJob.dateRange = parts[1];
                currentJob.location = parts[2];
              } else if (dateIdx === 0) {
                currentJob.dateRange = parts[0];
                if (currentJob.company && currentJob.company !== parts[1]) {
                  currentJob.role = `${currentJob.role} — ${currentJob.company}`;
                }
                currentJob.company = parts[1];
                currentJob.location = parts[2];
              } else {
                currentJob.company = parts[0];
                currentJob.location = parts[1];
                currentJob.dateRange = parts[2];
              }
            } else if (parts.length === 2) {
              const p0Date = isDateRange(parts[0]);
              const p1Date = isDateRange(parts[1]);
              
              if (p0Date && !p1Date) {
                currentJob.dateRange = parts[0];
                currentJob.location = parts[1];
              } else if (!p0Date && p1Date) {
                if (currentJob.company && currentJob.company !== parts[0]) {
                  currentJob.role = `${currentJob.role} — ${currentJob.company}`;
                }
                currentJob.company = parts[0];
                currentJob.dateRange = parts[1];
                currentJob.location = '';
              } else {
                currentJob.dateRange = parts[0];
                currentJob.location = parts[1];
              }
            } else {
              currentJob.dateRange = meta;
            }
            i = j;
          } else if (nextLine.startsWith('*') && nextLine.endsWith('*')) {
            currentJob.dateRange = nextLine.replace(/\*/g, '').trim();
            i = j;
          }
        }
      } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
        if (currentJob) {
          currentJob.bullets.push(line.replace(/^[-*+]\s*/, '').trim());
        }
      } else {
        if (currentJob) {
          currentJob.bullets.push(line);
        }
      }
    } else if (currentSection === 'EDUCATION') {
      let isEduHeader = false;
      let degree = '';
      let school = '';
      let dateRange = '';

      if (line.startsWith('**') && line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        isEduHeader = true;
        degree = parts[0].replace(/\*\*/g, '').trim();
        school = parts[1].replace(/\*/g, '').replace(/\*\*/g, '').trim();
      } else if (line.startsWith('**') && line.endsWith('**')) {
        isEduHeader = true;
        degree = line.replace(/\*\*/g, '').trim();
      }

      if (isEduHeader) {
        const eduItem = { degree, school, dateRange };
        sections[currentSection].push(eduItem);

        // Look ahead for school and dateRange
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) {
          j++;
        }
        if (j < lines.length) {
          const nextLine = lines[j].trim();
          const cleanNext = nextLine.replace(/\*\*/g, '').trim().toUpperCase();
          if (!nextLine.startsWith('##') && !SECTION_NAMES.includes(cleanNext)) {
            const parts = nextLine.replace(/\*/g, '').split('|').map(p => p.trim());
            if (parts.length >= 2) {
              eduItem.school = parts[0];
              eduItem.dateRange = parts[1];
            } else {
              if (!eduItem.school) eduItem.school = parts[0];
              else eduItem.dateRange = parts[0];
            }
            i = j;
          }
        }
      }
    } else if (currentSection === 'SKILLS' || currentSection === 'LANGUAGES') {
      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
        const item = line.replace(/^[-*+]\s*/, '').trim();
        const match = item.match(/^\*\*(.*?):\*\*\s*(.*)$/);
        if (match) {
          sections[currentSection].push({
            category: match[1].trim(),
            details: match[2].trim()
          });
        } else {
          const parts = item.split(':').map(p => p.trim());
          if (parts.length >= 2) {
            sections[currentSection].push({
              category: parts[0].replace(/\*\*/g, '').replace(/\*/g, '').trim(),
              details: parts[1]
            });
          } else {
            sections[currentSection].push({
              category: '',
              details: item
            });
          }
        }
      }
    } else {
      sections[currentSection].push(line);
    }
  }

  // Format headerLines into summary (excluding contact details)
  const cleanHeaderLines = headerLines.filter(l => {
    const clean = l.replace(/\*/g, '').trim();
    if (clean.toLowerCase().startsWith('personal information') || 
        clean.toLowerCase().startsWith('name:') || 
        clean.toLowerCase().startsWith('date of birth:') || 
        clean.toLowerCase().startsWith('gender:') || 
        clean.toLowerCase().startsWith('phone:') || 
        clean.toLowerCase().startsWith('email:') || 
        clean.toLowerCase().startsWith('address:')) {
      return false;
    }
    if (clean.startsWith('Note:')) return false;
    return true;
  });
  if (!summary) {
    summary = cleanHeaderLines.join('\n').trim();
  }

  // Extract contact info from Personal Information block if name/contact is empty
  let contactParts = [];
  headerLines.forEach(l => {
    const clean = l.replace(/\*/g, '').trim();
    const cleanLower = clean.toLowerCase();
    if (cleanLower.startsWith('name:')) {
      name = clean.substring(5).trim();
    } else if (cleanLower.startsWith('phone:')) {
      contactParts.push(clean.substring(6).trim());
    } else if (cleanLower.startsWith('email:')) {
      contactParts.push(clean.substring(6).trim());
    } else if (cleanLower.startsWith('address:')) {
      contactParts.unshift(clean.substring(8).trim()); // put address first for location
    }
  });

  if (contactParts.length > 0 && !contact) {
    contact = contactParts.join(' • ');
  }

  // Robust cleaning of Name
  if (name) {
    name = name.replace(/^CV\s*[-—–:|]\s*/i, '').trim();
  }

  // Robust extraction from parsed sections if they exist as custom sections
  const contactSectionKeys = Object.keys(sections).filter(k => k.includes('CONTACT') || k.includes('PERSONAL'));
  contactSectionKeys.forEach(key => {
    const items = sections[key];
    let loc = '';
    let email = '';
    let phone = '';
    let linkedin = '';
    
    items.forEach(item => {
      if (typeof item === 'string') {
        const clean = item.replace(/^[-*+]\s*/, '').trim();
        const cleanLower = clean.toLowerCase();
        if (cleanLower.includes('location:')) {
          loc = clean.split(/location:/i)[1].replace(/\*\*/g, '').replace(/\*/g, '').trim();
        } else if (cleanLower.includes('email:')) {
          email = clean.split(/email:/i)[1].replace(/\*\*/g, '').replace(/\*/g, '').trim();
        } else if (cleanLower.includes('phone:')) {
          phone = clean.split(/phone:/i)[1].replace(/\*\*/g, '').replace(/\*/g, '').trim();
        } else if (cleanLower.includes('linkedin:')) {
          linkedin = clean.split(/linkedin:/i)[1].replace(/\*\*/g, '').replace(/\*/g, '').trim();
        } else if (clean.includes('•') || clean.includes('|') || clean.includes('@') || clean.includes('+')) {
          contact = clean;
        }
      }
    });

    if (!contact) {
      const parts = [loc, email, phone, linkedin].filter(Boolean);
      if (parts.length > 0) {
        contact = parts.join(' • ');
      }
    }
    delete sections[key];
  });

  const summarySectionKeys = Object.keys(sections).filter(k => k === 'SUMMARY' || k === 'PROFESSIONAL SUMMARY');
  summarySectionKeys.forEach(key => {
    const items = sections[key];
    if (items.length > 0) {
      summary = items.join('\n').trim();
    }
    delete sections[key];
  });

  if (sections['EXPERIENCE']) {
    sections['WORK EXPERIENCE'] = sections['EXPERIENCE'];
    delete sections['EXPERIENCE'];
  }

  return { name, contact, summary, sections };
}

// Helper: Serialize structured JSON back to markdown cv.md
export function serializeCV(cvData) {
  if (cvData.type === 'cover-letter') {
    return `${letterMarker}\n\n` + letterFields.map(key =>
      `## ${key.toUpperCase()}\n${cvData[key].replace(/^(\\|## )/gm, '\\$1')}\n\n`).join('');
  }
  let md = [];
  md.push(`# ${cvData.name}`);
  md.push(cvData.contact);
  md.push('');
  md.push(cvData.summary);
  md.push('');
  md.push('---');
  md.push('');

  Object.entries(cvData.sections).forEach(([sectionName, items]) => {
    md.push(`## ${sectionName}`);
    md.push('');

    if (sectionName === 'WORK EXPERIENCE') {
      items.forEach(job => {
        if (job.company) {
          md.push(`### ${job.role} — ${job.company}`);
        } else {
          md.push(`### ${job.role}`);
        }
        if (job.dateRange && job.location) {
          md.push(`**${job.dateRange} | ${job.location}**`);
        } else if (job.dateRange) {
          md.push(`**${job.dateRange}**`);
        } else if (job.location) {
          md.push(`**${job.location}**`);
        }
        md.push('');
        job.bullets.forEach(b => {
          md.push(`- ${b}`);
        });
        md.push('');
      });
    } else if (sectionName === 'EDUCATION') {
      items.forEach(edu => {
        md.push(`**${edu.degree}**`);
        if (edu.school || edu.dateRange) {
          md.push(`${edu.school} | ${edu.dateRange}`);
        }
        md.push('');
      });
    } else if (sectionName === 'SKILLS' || sectionName === 'LANGUAGES') {
      items.forEach(skill => {
        if (skill.category) {
          md.push(`- **${skill.category}:** ${skill.details}`);
        } else {
          md.push(`- ${skill.details}`);
        }
      });
      md.push('');
    } else {
      items.forEach(item => {
        md.push(item);
      });
      md.push('');
    }
  });

  return md.join('\n');
}

import React, { useLayoutEffect, useRef } from 'react';
import { orderedSections } from '../sectionOrder';
import { getTemplate } from '../templates';

function formatted(text) {
  return String(text || '').split(/(\*\*\*.+?\*\*\*|\*\*.+?\*\*|\*[^*]+\*|__.+?__|_[^_]+_)/g).map((part, index) => {
    if (part.startsWith('***') && part.endsWith('***')) return <strong key={index}><em>{part.slice(3, -3)}</em></strong>;
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.length > 1 && ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function Field({ value, onChange, label, className = '' }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (ref.current && document.activeElement !== ref.current) ref.current.value = value || '';
  }, [value]);
  return <span className={`field ${className}`}>
    <span className="field-text">{formatted(value) || '\u00a0'}</span>
    <textarea ref={ref} aria-label={label} defaultValue={value || ''} spellCheck={false}
      onChange={event => onChange(event.target.value.replace(/\r/g, ''))}
      onBlur={() => { if (ref.current) ref.current.scrollTop = 0; }} />
  </span>;
}

export default function CVEditor({ data, layout, edit, sheetRef, overflow, zoom, preview = false, samplePhoto = false }) {
  const update = (field, value) => edit({ ...data, [field]: value });
  const updateItem = (section, index, patch, discrete = false) => edit({ ...data, sections: { ...data.sections,
    [section]: data.sections[section].map((item, i) => i === index ? { ...item, ...patch } : item) } }, layout, discrete);
  const setItems = (section, items) => edit({ ...data, sections: { ...data.sections, [section]: items } }, layout, true);
  const removeItem = (section, items, index, label) => <button className="item-remove no-print" aria-label={`Xóa ${label} ${index + 1}`} title="Có thể hoàn tác" onClick={() => setItems(section, items.filter((_, i) => i !== index))}>Xóa {label}</button>;
  const field = (value, onChange, label, className) => <Field {...{ value, onChange, label, className }} />;
  const isLetter = data.type === 'cover-letter';
  const template = getTemplate(isLetter ? undefined : layout.templateId);
  const sections = isLetter ? [] : orderedSections(data.sections);
  const isSideSection = ([name]) => /^(SKILLS|LANGUAGES(?: & TOOLS)?)$/i.test(name.trim());
  const mainSections = template.columns ? sections.filter(entry => !isSideSection(entry)) : sections;
  const sideSections = sections.filter(isSideSection);
  const renderSections = entries => entries.map(([section, items]) => <section className="cv-section" key={section}>
          <h2>{section}</h2>
          {section === 'WORK EXPERIENCE' ? <>
            {items.map((job, index) => <div className="cv-job" key={index}>
              <div className="cv-row">
                {field(job.role, value => updateItem(section, index, { role: value }), `Chức danh ${index + 1}`, 'cv-role')}
                {field(job.dateRange, value => updateItem(section, index, { dateRange: value }), `Thời gian công việc ${index + 1}`, 'cv-date')}
              </div>
              <div className="cv-row cv-company-row">
                {field(job.company, value => updateItem(section, index, { company: value }), `Công ty ${index + 1}`, 'cv-company')}
                {field(job.location, value => updateItem(section, index, { location: value }), `Địa điểm ${index + 1}`, 'cv-date')}
              </div>
              <ul className="cv-bullets">
                {job.bullets.map((bullet, bulletIndex) => <li key={bulletIndex} className={/^\*[^*].*\*$/.test(bullet) ? 'intro-bullet' : ''}>
                  {field(bullet, value => updateItem(section, index, { bullets: job.bullets.map((b, i) => i === bulletIndex ? value : b) }), `Nội dung ${index + 1}.${bulletIndex + 1}`)}
                  <button className="remove-bullet no-print" title="Xóa ý này (có thể hoàn tác)" aria-label={`Xóa nội dung ${index + 1}.${bulletIndex + 1}`}
                    onClick={() => updateItem(section, index, { bullets: job.bullets.filter((_, i) => i !== bulletIndex) }, true)}>×</button>
                </li>)}
              </ul>
              <div className="item-actions no-print"><button className="inline-add" onClick={() => updateItem(section, index, { bullets: [...job.bullets, 'Nội dung mới'] }, true)}>+ Thêm ý</button>{removeItem(section, items, index, 'công việc')}</div>
            </div>)}
            <button className="section-add no-print" onClick={() => setItems(section, [...items, { role: 'Chức danh', company: 'Công ty', dateRange: '', location: '', bullets: ['Nội dung mới'] }])}>+ Công việc</button>
          </> : section === 'EDUCATION' ? <>
            {items.map((edu, index) => <div className="cv-education" key={index}>
              <div className="cv-row">
                {field(edu.degree, value => updateItem(section, index, { degree: value }), `Bằng cấp ${index + 1}`, 'cv-role')}
                {field(edu.dateRange, value => updateItem(section, index, { dateRange: value }), `Thời gian học ${index + 1}`, 'cv-date')}
              </div>
              {field(edu.school, value => updateItem(section, index, { school: value }), `Trường ${index + 1}`)}
              {removeItem(section, items, index, 'học vấn')}
            </div>)}
            <button className="section-add no-print" onClick={() => setItems(section, [...items, { degree: 'Bằng cấp', school: 'Trường', dateRange: '' }])}>+ Học vấn</button>
          </> : ['SKILLS', 'LANGUAGES'].includes(section) ? <>
            {items.map((skill, index) => <div className="cv-skill" key={index}>
              {skill.category.trim() && field(skill.category, value => updateItem(section, index, { category: value }), `Nhóm ${section} ${index + 1}`, 'cv-skill-category')}
              {field(skill.details, value => updateItem(section, index, { details: value }), `${section} ${index + 1}`)}
              {removeItem(section, items, index, `dòng ${section}`)}
            </div>)}
            <button className="section-add no-print" onClick={() => setItems(section, [...items, { category: '', details: 'Nội dung mới' }])}>+ Thêm dòng</button>
          </> : field(items.join('\n'), value => setItems(section, value.split('\n')), section)}
        </section>);
  const identity = <header className="cv-header">
    <div className="cv-identity">
      {field(data.name, value => update('name', value), 'Họ và tên', 'cv-name')}
      {!template.columns && field(data.contact, value => update('contact', value), 'Thông tin liên hệ', 'cv-contact')}
    </div>
    {!isLetter && template.photo && (layout.photo ? <img className="cv-photo" src={layout.photo} alt="Ảnh chân dung" /> : samplePhoto && <div className="cv-photo photo-placeholder"><span /></div>)}
  </header>;
  return <div className={`paper-zoom ${preview ? 'read-only-preview' : ''}`} style={{ zoom }}>
    <article className={`cv-sheet template-${template.id} ${overflow ? 'overflowing' : ''}`} ref={sheetRef} style={{
      '--cv-size': `${layout.fontSize}px`, '--cv-leading': layout.lineHeight,
      '--section-gap': `${layout.sectionGap}px`, '--page-margin': `${layout.margin}mm`,
    }}>
      <div className="page-limit" aria-hidden="true"><span>Giới hạn nội dung trang 1</span></div>
      <div className="cv-content">
        {!template.sidebarIdentity && identity}
        {data.type === 'cover-letter' ? <div className="letter-content">
          {field(data.date, value => update('date', value), 'Ngày viết thư', 'letter-date')}
          {field(data.recipient, value => update('recipient', value), 'Người nhận và công ty')}
          {field(data.subject, value => update('subject', value), 'Tiêu đề thư', 'letter-subject')}
          {field(data.salutation, value => update('salutation', value), 'Lời chào')}
          {field(data.body, value => update('body', value), 'Nội dung thư')}
          <div className="letter-signature">
            {field(data.closing, value => update('closing', value), 'Lời kết')}
            {field(data.signature, value => update('signature', value), 'Chữ ký', 'cv-role')}
          </div>
        </div> : <>
        <div className={template.columns ? 'cv-columns' : 'cv-single-column'}>
          <div className="cv-main-column">
            <div className="cv-summary">{field(data.summary, value => update('summary', value), 'Giới thiệu')}</div>
            {renderSections(mainSections)}
          </div>
          {template.columns && <aside className="cv-side-column">
            {template.sidebarIdentity && identity}
            <section className="cv-section"><h2>Liên hệ</h2>{field(data.contact, value => update('contact', value), 'Thông tin liên hệ', 'cv-contact')}</section>
            {renderSections(sideSections)}
          </aside>}
        </div>
        </>}
      </div>
    </article>
    <div className="paper-caption no-print">A4 · 210 × 297 mm · Bấm vào nội dung để sửa</div>
  </div>;
}

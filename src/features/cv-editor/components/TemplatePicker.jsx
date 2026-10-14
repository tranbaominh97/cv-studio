import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { defaultLayout, getTemplate, templates } from '../templates';
import CVEditor from './CVEditor';

const sample = {
  name: 'NGUYỄN ANH MINH', contact: 'minh@example.com • TP. Hồ Chí Minh',
  summary: 'Chuyên viên vận hành\nKết nối con người, cải tiến quy trình và tạo ra kết quả có thể đo lường.',
  sections: {
    'WORK EXPERIENCE': [
      { role: 'Chuyên viên vận hành', company: 'Công ty Ánh Dương', dateRange: '2022 – Nay', location: 'TP. Hồ Chí Minh', bullets: ['Điều phối hoạt động và theo dõi tiến độ của nhóm.', 'Cải tiến quy trình báo cáo, giảm thời gian xử lý.', 'Phối hợp cùng các bộ phận để nâng cao trải nghiệm khách hàng.'] },
      { role: 'Trợ lý dự án', company: 'Công ty Bình Minh', dateRange: '2020 – 2022', location: '', bullets: ['Tổng hợp dữ liệu và chuẩn bị báo cáo định kỳ.', 'Hỗ trợ triển khai các dự án nội bộ.'] },
    ],
    EDUCATION: [{ degree: 'Cử nhân Quản trị kinh doanh', school: 'Đại học Kinh tế', dateRange: '2016 – 2020' }],
    SKILLS: [{ category: '', details: 'Quản lý dự án\nPhân tích dữ liệu\nGiao tiếp & phối hợp\nExcel · PowerPoint' }],
    LANGUAGES: [{ category: '', details: 'Tiếng Việt: bản ngữ\nTiếng Anh: thành thạo' }],
  },
};

export default function TemplatePicker({ changing, currentTemplate, currentData, currentLayout, files, filename, busy, error, onCancel, onApply, onCreate }) {
  const [selected, setSelected] = useState(getTemplate(currentTemplate).id);
  const [step, setStep] = useState('template');
  const [source, setSource] = useState(files.length ? 'existing' : 'blank');
  const [sourceFile, setSourceFile] = useState(files.includes(filename) ? filename : files[0] || '');
  const [name, setName] = useState('');
  const [filter, setFilter] = useState('all');
  const [largePreview, setLargePreview] = useState(null);
  const previewDialog = useRef(null);
  const [imported, setImported] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const previewData = changing && currentData ? currentData : sample;
  const previewLayout = changing && currentData ? currentLayout : { ...defaultLayout, fontSize: 14, sectionGap: 17 };
  useEffect(() => { if (largePreview && !previewDialog.current.open) previewDialog.current.showModal(); }, [largePreview]);
  async function importFile() {
    setImporting(true); setImportError('');
    try {
      const document = await window.desktop.importCV();
      if (document) { setImported(document); setSource('existing'); if (!name.trim()) setName(`${document.filename.replace(/\.md$/, '')} - Bản mới`.slice(0, 175)); }
    } catch (error) { setImportError(error.message); }
    finally { setImporting(false); }
  }
  const visibleTemplates = templates.filter(template => filter === 'all' || (filter === 'photo' ? template.photo : filter === 'columns' ? template.columns : !template.columns));
  const title = useRef(null);
  useEffect(() => { title.current?.focus(); }, [step]);
  return <main className="template-screen no-print">
    <div className="flow-top"><button disabled={busy} onClick={step === 'content' ? () => setStep('template') : onCancel}><ArrowLeft size={16} />{step === 'content' ? 'Chọn lại mẫu' : 'Quay lại'}</button>
      <span>{changing ? 'ĐỔI MẪU CV' : step === 'template' ? 'BƯỚC 1 / 2 · CHỌN MẪU' : 'BƯỚC 2 / 2 · NỘI DUNG'}</span></div>
    <h1 ref={title} tabIndex={-1}>{step === 'template' ? 'Một khởi đầu đúng phong cách.' : 'Bắt đầu từ nội dung của bạn.'}</h1>
    <p className="flow-description">{step === 'template' ? 'Chọn mẫu phù hợp. Bạn luôn có thể đổi mẫu trong lúc chỉnh sửa.' : `Mẫu ${getTemplate(selected).name} đã sẵn sàng. Nội dung tiếp tục được lưu trong file .md.`}</p>
    {error && <p className="banner error" role="alert">{error}</p>}
    {step === 'template' ? <>
      <div className="template-filters" aria-label="Lọc mẫu CV" role="group">{[['all', 'Tất cả'], ['single', 'Một cột'], ['columns', 'Hai cột'], ['photo', 'Có ảnh']].map(([value, label]) => <button key={value} disabled={busy} aria-pressed={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}<span role="status">{visibleTemplates.length} mẫu</span></div>
      <fieldset className="template-grid" disabled={busy}><legend className="sr-only">Chọn mẫu CV</legend>
        {visibleTemplates.map(template => <div className={`template-card ${selected === template.id ? 'selected' : ''}`} key={template.id}><label>
          <input type="radio" name="template" value={template.id} checked={selected === template.id} onChange={() => setSelected(template.id)} />
          <div className="template-preview" inert="" aria-hidden="true"><CVEditor data={previewData} layout={{ ...previewLayout, templateId: template.id }} edit={() => {}} zoom={0.25} preview samplePhoto={!changing} /></div>
          <div className="template-card-text"><strong>{template.name}{selected === template.id && <Check size={16} />}</strong><span>{template.description}</span><small>{template.columns ? 'Hai cột' : 'Một cột'} · {template.photo ? 'Ảnh tùy chọn' : 'Không ảnh'}</small></div>
        </label><button className="preview-template-button" aria-label={`Xem lớn mẫu ${template.name}`} onClick={() => setLargePreview(template.id)}>Xem lớn</button></div>)}
      </fieldset>
      <div className="flow-footer template-footer"><span>Đang chọn: <b>{getTemplate(selected).name}</b><small>{changing ? 'Nội dung được giữ nguyên khi đổi mẫu.' : `${templates.length} mẫu · Khổ A4 · Có thể xuất nhiều trang`}</small></span><button className="primary" disabled={busy} onClick={() => changing ? onApply(selected) : setStep('content')}>{changing ? 'Áp dụng mẫu' : 'Tiếp tục'}<ArrowRight size={16} /></button></div>
    </> : <form className="content-choice" onSubmit={event => { event.preventDefault(); if (!importing) onCreate(name, selected, source === 'existing' && !imported ? sourceFile : null, source === 'existing' ? imported : null); }}>
      <fieldset disabled={busy || importing}><legend className="sr-only">Nguồn nội dung</legend>
        <label className={`source-option ${source === 'existing' ? 'selected' : ''}`}><input type="radio" name="source" checked={source === 'existing'} onChange={() => setSource('existing')} /><span><strong>Dùng CV có sẵn</strong><small>Tạo bản mới từ nội dung đã có. Bản gốc được giữ nguyên.</small></span></label>
        <label className={`source-option ${source === 'blank' ? 'selected' : ''}`}><input type="radio" name="source" checked={source === 'blank'} onChange={() => setSource('blank')} /><span><strong>Tạo nội dung mới</strong><small>Bắt đầu với thông tin cá nhân, kinh nghiệm, học vấn và kỹ năng.</small></span></label>
      </fieldset>
      {source === 'existing' && <div className="import-source">{files.length > 0 && <label className="form-field">CV trong thư mục<select value={imported ? '' : sourceFile} disabled={busy || importing} onChange={event => { setImported(null); setSourceFile(event.target.value); }}><option value="" disabled>Chọn CV trong thư mục…</option>{files.map(file => <option key={file} value={file}>{file.replace(/\.md$/, '')}</option>)}</select></label>}<button type="button" disabled={busy || importing} onClick={importFile}>{importing ? 'Đang đọc file…' : 'Chọn file .md từ máy'}</button>{imported && <p role="status">Đã chọn: <strong>{imported.filename}</strong></p>}<p className="control-hint">Hỗ trợ cấu trúc Markdown của CV Studio. Bản mới được lưu vào thư mục tài liệu hiện tại.</p></div>}
      {importError && <p className="dialog-error" role="alert">{importError}</p>}
      <label className="form-field">Tên CV mới<input type="text" required maxLength={175} value={name} disabled={busy} placeholder="Ví dụ: CV ứng tuyển vận hành" onChange={event => setName(event.target.value)} /></label>
      <div className="flow-footer"><span>Mẫu {getTemplate(selected).name}</span><button className="primary" disabled={busy || importing || !name.trim() || (source === 'existing' && !sourceFile && !imported)}>Tạo CV & chỉnh sửa<ArrowRight size={16} /></button></div>
    </form>}
    {largePreview && <dialog ref={previewDialog} className="modal template-large-modal" aria-labelledby="template-preview-title" onCancel={event => { event.preventDefault(); setLargePreview(null); }}><div className="large-preview-header"><div><h2 id="template-preview-title">{getTemplate(largePreview).name}</h2><p>{changing ? 'Nội dung CV đang mở. Phân trang chính xác có trong “Xem bản in”.' : 'Nội dung minh họa · Bạn sẽ chọn nội dung ở bước tiếp theo.'}</p></div><button autoFocus onClick={() => setLargePreview(null)}>Đóng</button><button className="primary" onClick={() => { setSelected(largePreview); setLargePreview(null); }}>Chọn mẫu này</button></div><div className="large-preview-paper" inert=""><CVEditor data={previewData} layout={{ ...previewLayout, templateId: largePreview }} edit={() => {}} zoom={0.8} preview samplePhoto={!changing} /></div></dialog>}
  </main>;
}

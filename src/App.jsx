import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FileText, FolderOpen, Copy, RefreshCw, Undo2, Download, Printer, Eye, Pencil, Check, AlertCircle, Save } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useCVState } from './features/cv-editor/hooks/useCVState';
import CVEditor from './features/cv-editor/components/CVEditor';
import TemplatePicker from './features/cv-editor/components/TemplatePicker';
import PhotoEditor from './features/cv-editor/components/PhotoEditor';
import { getTemplate, templates } from './features/cv-editor/templates';

GlobalWorkerOptions.workerSrc = workerURL;

function PDFPreview({ pdf, onError }) {
  const container = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const tasks = [];
    const host = container.current;
    host.replaceChildren();
    (async () => {
      for (let i = 1; i <= pdf.document.numPages; i++) {
        const page = await pdf.document.getPage(i);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.setAttribute('aria-label', `Bản in PDF trang ${i}`);
        host.appendChild(canvas);
        const task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
        tasks.push(task);
        await task.promise;
      }
    })().catch(error => { if (!cancelled) onError(error); });
    return () => { cancelled = true; tasks.forEach(task => task.cancel()); };
  }, [pdf]);
  return <div className="pdf-pages" ref={container} />;
}

export default function App() {
  const cv = useCVState();
  const isLetter = cv.kind === 'cover-letter';
  const documentLabel = isLetter ? 'Cover Letter' : 'CV';
  const sheet = useRef(null);
  const [usedHeight, setUsedHeight] = useState(0);
  const [zoom, setZoom] = useState('fit');
  const [fitZoom, setFitZoom] = useState(1);
  const workspace = useRef(null);
  const [busy, setBusy] = useState(false);
  const [pdf, setPDF] = useState(null);
  const pdfRef = useRef(null);
  const [mode, setMode] = useState('edit');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const modalRef = useRef(null);
  const [newName, setNewName] = useState('');
  const [flow, setFlow] = useState(null);
  const [exportAction, setExportAction] = useState('save');
  const template = getTemplate(cv.layout.templateId);
  const unavailable = !cv.data || busy || cv.loading || Boolean(flow);
  const availableHeight = (297 - cv.layout.margin * 2) * 96 / 25.4;
  const estimatedOverflow = usedHeight > availableHeight + 0.5;
  // Screen layout is only an estimate. A generated PDF is authoritative until edited.
  const pdfPages = pdf?.document.numPages;
  const overflow = pdfPages == null ? estimatedOverflow : pdfPages > 1;
  const overflowMM = Math.max(0, (usedHeight - availableHeight) * 25.4 / 96);
  const sectionChoices = [['WORK EXPERIENCE', 'Kinh nghiệm'], ['EDUCATION', 'Học vấn'], ['SKILLS', 'Kỹ năng'], ['LANGUAGES', 'Ngôn ngữ'], ['PROJECTS', 'Dự án'], ['CERTIFICATIONS', 'Chứng chỉ'], ['AWARDS', 'Giải thưởng'], ['VOLUNTEERING', 'Hoạt động']];

  useLayoutEffect(() => {
    const host = workspace.current;
    if (!host) return;
    const update = () => {
      const paper = host.querySelector('.paper-workspace');
      const style = paper && getComputedStyle(paper);
      const padding = style ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) : 80;
      setFitZoom(Math.max(0.25, Math.min(1, (host.clientWidth - padding - 2) / (210 * 96 / 25.4))));
    };
    const observer = new ResizeObserver(update);
    observer.observe(host);
    update();
    return () => observer.disconnect();
  }, [flow, cv.loading]);

  useLayoutEffect(() => {
    if (!sheet.current) return;
    const content = sheet.current.querySelector('.cv-content');
    const update = () => {
      // Editing buttons occupy screen space but must not count toward the A4 estimate.
      const measurement = sheet.current.cloneNode(true);
      measurement.classList.add('read-only-preview');
      Object.assign(measurement.style, { position: 'fixed', left: '-10000px', top: '0', visibility: 'hidden', zoom: '1' });
      document.body.appendChild(measurement);
      setUsedHeight(measurement.querySelector('.cv-content').offsetHeight);
      measurement.remove();
    };
    const observer = new ResizeObserver(update);
    observer.observe(content);
    update();
    return () => observer.disconnect();
  }, [cv.kind, cv.filename, cv.loading, mode, flow]);

  useEffect(() => {
    if (!cv.loading && !cv.data && cv.kind === 'cv' && window.desktop) setFlow('create');
  }, [cv.loading, cv.kind, cv.data]);
  useEffect(() => { if (modal && !modalRef.current.open) modalRef.current.showModal(); }, [modal]);

  function invalidate() {
    if (pdfRef.current) { pdfRef.current.loadingTask.destroy().catch(() => {}); pdfRef.current = null; }
    setPDF(null);
    setMode('edit');
    setNotice('');
  }
  function edit(data, layout, undo) { invalidate(); cv.edit(data, layout, undo); }
  async function run(action) {
    if (busy) return;
    setBusy(true);
    try { await action(); }
    catch (error) { cv.fail(error); }
    finally { setBusy(false); }
  }
  async function buildPDF() {
    await cv.flush();
    if (pdfRef.current) return pdfRef.current;
    document.activeElement?.blur();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const bytes = await window.desktop.pdf();
    const loadingTask = getDocument({ data: bytes.slice(), isEvalSupported: false });
    const pdfDocument = await loadingTask.promise;
    const next = { bytes, document: pdfDocument, loadingTask };
    pdfRef.current = next;
    setPDF(next);
    return next;
  }
  async function preview() { await buildPDF(); setMode('pdf'); }
  async function savePDF(confirmed = false) {
    const result = await buildPDF();
    if (result.document.numPages > 1 && !confirmed) { setMode('pdf'); setExportAction('save'); setModal('export-pages'); return; }
    const destination = await window.desktop.savePDF(cv.filename, result.bytes);
    if (destination) setNotice(`Đã lưu PDF: ${destination}`);
    setModal(null);
  }
  async function print(confirmed = false) {
    const result = await buildPDF();
    if (result.document.numPages > 1 && !confirmed) { setMode('pdf'); setExportAction('print'); setModal('export-pages'); return; }
    const printed = await window.desktop.print();
    if (printed) setNotice('Đã gửi bản in tới máy in bạn chọn.');
    setModal(null);
  }
  function openTemplates(changing = false) { cv.clearError(); setFlow(changing ? 'change' : 'create'); }
  function askDuplicate() { setNewName((cv.filename.replace(/\.md$/, '') + (cv.filename ? ' - Bản sao' : `${documentLabel} mới`)).slice(0, 175)); setModal('duplicate'); }
  function askLetter() { setNewName((cv.sourceName.replace(/\.md$/, '').slice(0, 155) + ' - Cover Letter').replace(/^ - /, '')); setModal('create-letter'); }
  async function reload() { invalidate(); await cv.reload(); setModal(null); }
  const actions = useRef({});
  actions.current = { save: () => !unavailable && !modal && run(() => cv.flush()), print: () => !unavailable && !modal && run(print), undo: () => { if (unavailable || modal) return; invalidate(); cv.undo(); } };
  useEffect(() => {
    function keyboard(event) {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (document.querySelector('dialog[open]') && ['s', 'p', 'z'].includes(event.key.toLowerCase())) { if (event.key.toLowerCase() !== 'z') event.preventDefault(); return; }
      if (event.key.toLowerCase() === 's') { event.preventDefault(); actions.current.save(); }
      if (event.key.toLowerCase() === 'p') { event.preventDefault(); actions.current.print(); }
      if (event.key.toLowerCase() === 'z' && document.activeElement?.tagName !== 'TEXTAREA') { event.preventDefault(); actions.current.undo(); }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);

  return <div className={`studio ${busy ? 'is-busy' : ''}`}>
    <style>{`@page { size: A4; margin: ${cv.layout.margin}mm; background: white; }`}</style>
    <header className="toolbar no-print">
      <div className="brand"><img className="brand-mark" src="./app-icon.png" alt="" /><div><b>CV Studio</b><small>{templates.length} mẫu CV · Hồ sơ của bạn.</small></div></div>
      {!flow && <div className="current-document"><strong title={cv.filename}>{cv.filename.replace(/\.md$/, '') || 'Chưa mở tài liệu'}</strong><div className="save-status" role="status">{cv.data && (cv.dirty ? <><span className="status-dot pending" />{cv.error ? 'Chưa lưu được' : 'Đang lưu...'}</> : <><Check size={15} />Đã lưu</>)}</div></div>}
      <div className="toolbar-actions">
        {!flow && <><button disabled={unavailable} className={mode === 'pdf' ? 'active' : ''} onClick={() => mode === 'pdf' ? setMode('edit') : run(preview)}>{mode === 'pdf' ? <Pencil size={17} /> : <Eye size={17} />}{mode === 'pdf' ? 'Quay lại sửa' : 'Xem bản in'}</button>
        <button disabled={unavailable} onClick={() => run(print)}><Printer size={17} />In</button>
        <button className="primary" disabled={unavailable} onClick={() => run(savePDF)}><Download size={17} />Lưu PDF</button></>}
      </div>
    </header>
    {flow ? <TemplatePicker changing={flow === 'change'} currentTemplate={cv.layout.templateId} currentData={cv.data} currentLayout={cv.layout} files={cv.files} filename={cv.filename} busy={busy} error={cv.error}
      onCancel={() => setFlow(null)} onApply={templateId => { edit(cv.data, { ...cv.layout, templateId }, true); setFlow(null); }}
      onCreate={(name, templateId, sourceFile, imported) => run(async () => { await cv.createCV(name, templateId, sourceFile, imported); invalidate(); setFlow(null); })} /> :
    <div className="studio-body">
      <aside className="sidebar no-print">
        <div className="document-tabs" role="tablist" aria-label="Loại tài liệu">
          {[['cv', 'CV'], ['cover-letter', 'Cover Letter']].map(([kind, label]) => <button key={kind} id={`tab-${kind}`} role="tab" aria-selected={cv.kind === kind} aria-controls="document-workspace" disabled={busy || cv.loading} className={cv.kind === kind ? 'active' : ''}
            onClick={() => run(async () => { await cv.changeKind(kind); invalidate(); })}>{label}</button>)}
        </div>
        <button className="new-document" disabled={busy || cv.loading || !window.desktop} onClick={isLetter ? askLetter : () => openTemplates()}>+ {isLetter ? 'Tạo Cover Letter mới' : 'Tạo CV mới'}</button>
        <label className="control-label" htmlFor="cv-select">{documentLabel} đang mở</label>
        <select id="cv-select" value={cv.filename} disabled={busy || cv.loading} onChange={event => run(async () => { await cv.changeFile(event.target.value); invalidate(); })}>
          {!cv.files.length && <option value="">Chưa có {documentLabel}</option>}
          {cv.files.map(file => <option key={file} value={file}>{file.replace(/\.md$/, '')}</option>)}
        </select>
        <details className="file-menu"><summary>Thao tác tài liệu</summary><div className="file-actions">
          <button disabled={busy || cv.loading || !window.desktop} onClick={cv.data ? askDuplicate : isLetter ? askLetter : () => openTemplates()}><Copy size={15} />{cv.data ? 'Tạo bản sao' : 'Tạo mới'}</button>
          <button disabled={busy || cv.loading || !window.desktop} title="Đọc lại tài liệu sau khi Codex sửa file" onClick={() => cv.dirty ? setModal('reload') : run(reload)}><RefreshCw size={15} />Nạp lại</button>
        </div>
        {isLetter && <p className="letter-hint">Thư mới dùng tên, liên hệ và căn trang của CV vừa mở.</p>}
        <button className="text-button folder-button" disabled={busy || cv.loading || !window.desktop} onClick={() => run(async () => { await cv.chooseFolder(); invalidate(); })}><FolderOpen size={16} />Chọn thư mục tài liệu</button>
        <div className="folder-path" title={cv.directory}>{cv.directory}</div>
        </details>
        {!isLetter && cv.data && <div className="appearance-controls"><span className="eyebrow">MẪU CV</span><div className="template-current"><b>{template.name}</b><button disabled={busy || cv.loading} onClick={() => openTemplates(true)}>Đổi mẫu</button></div>
          {template.photo ? <PhotoEditor key={cv.filename} templateId={template.id} photo={cv.layout.photo} disabled={busy || mode === 'pdf'} onChange={photo => edit(cv.data, { ...cv.layout, photo }, true)} /> : <p className="control-hint">{cv.layout.photo ? 'Ảnh được giữ lại và sẽ hiện khi chọn mẫu hỗ trợ ảnh.' : 'Mẫu này không sử dụng ảnh.'}</p>}
        </div>}
        {!isLetter && cv.data?.sections && <details className="section-manager"><summary>Mục nội dung</summary><p className="control-hint">Thêm hoặc xóa mục. Xóa nhầm có thể hoàn tác.</p>
          {Object.keys(cv.data.sections).map(section => <div className="section-manager-row" key={section}><span>{sectionChoices.find(([key]) => key === section)?.[1] || section}</span><button disabled={unavailable || mode === 'pdf'} aria-label={`Xóa mục ${section}`} onClick={() => { const sections = { ...cv.data.sections }; delete sections[section]; edit({ ...cv.data, sections }, cv.layout, true); }}>Xóa</button></div>)}
          <label className="control-label">Thêm mục<select aria-label="Thêm mục nội dung" value="" disabled={unavailable || mode === 'pdf'} onChange={event => { const section = event.target.value; if (section) edit({ ...cv.data, sections: { ...cv.data.sections, [section]: ['WORK EXPERIENCE', 'EDUCATION', 'SKILLS', 'LANGUAGES'].includes(section) ? [] : ['Nội dung mới'] } }, cv.layout, true); }}><option value="">Chọn mục cần thêm…</option>{sectionChoices.filter(([key]) => !(key in cv.data.sections)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </details>}
        <div className={`page-card ${overflow ? 'warning' : ''}`}>
          <div className="page-card-title">{overflow ? <AlertCircle size={19} /> : <FileText size={19} />}<b>{!cv.data ? 'Khổ giấy A4' : pdfPages != null ? `PDF: ${pdfPages} trang A4` : overflow ? `Ước tính tràn ${overflowMM.toFixed(1)} mm` : 'Ước tính vừa 1 trang A4'}</b></div>
          {overflow && <p>{pdfPages != null ? 'Bạn có thể xuất toàn bộ các trang hoặc chỉnh lại để gọn hơn.' : 'Nội dung có thể vượt một trang. Xem bản in để kiểm tra trước khi xuất.'}</p>}
        </div>
        <details className="layout-controls"><summary>Căn trang</summary>
          {[
            ['fontSize', 'Cỡ chữ', 9, 16, 0.25, `${(cv.layout.fontSize * 0.75).toFixed(1)} pt`],
            ['lineHeight', 'Giãn dòng', 1.1, 1.8, 0.05, cv.layout.lineHeight.toFixed(2)],
            ['sectionGap', isLetter ? 'Khoảng cách phần' : 'Khoảng cách mục', 3, 20, 1, `${cv.layout.sectionGap} px`],
            ['margin', 'Lề trang', 6, 20, 0.5, `${cv.layout.margin} mm`],
          ].map(([key, label, min, max, step, display]) => <label className="slider-control" key={key}>
            <span>{label}<b>{display}</b></span><input type="range" min={min} max={max} step={step} value={cv.layout[key]} disabled={!cv.data || busy || mode === 'pdf'}
              onChange={event => edit(cv.data, { ...cv.layout, [key]: Number(event.target.value) })} />
          </label>)}
        </details>
        <button className="text-button" disabled={!cv.history.length || busy} onClick={() => { invalidate(); cv.undo(); }}><Undo2 size={15} />Hoàn tác chỉnh sửa</button>
      </aside>
      <main ref={workspace} className="workspace" id="document-workspace" role="tabpanel" aria-labelledby={`tab-${cv.kind}`}>
        <div className="workspace-top no-print"><span>{mode === 'pdf' ? 'BẢN PDF THỰC TẾ' : 'CHỈNH SỬA TRÊN TRANG'}<b>{mode === 'pdf' && pdf ? `${pdf.document.numPages} trang · A4` : 'A4 · 210 × 297 mm'}</b></span>
          {mode === 'edit' && <label className="zoom-control">Thu/phóng <select aria-label="Thu phóng" value={zoom} onChange={event => setZoom(event.target.value === 'fit' ? 'fit' : Number(event.target.value))}><option value="fit">Vừa chiều rộng</option>{[0.7, 0.85, 1, 1.15, 1.3].map(value => <option key={value} value={value}>{Math.round(value * 100)}%</option>)}</select></label>}
        </div>
        {mode === 'edit' && cv.data && <p className="edit-hint no-print">Bấm trực tiếp vào chữ để sửa · Mở “Mục nội dung” để thêm phần mới · Tự động lưu</p>}
        {cv.error && <div className="banner error no-print" role="alert"><AlertCircle size={18} /><span>{cv.error}</span>{cv.data && <button onClick={() => run(() => cv.flush())}><Save size={14} />Thử lưu lại</button>}</div>}
        {cv.external && <div className="banner no-print"><RefreshCw size={17} /><span>Có bản {documentLabel} mới từ bên ngoài app.</span><button onClick={() => cv.dirty ? setModal('reload') : run(reload)}>Nạp bản mới</button></div>}
        {notice && <div className="banner no-print" role="status">{notice}</div>}
        {busy && <div className="busy-label no-print" role="status">Đang xử lý...</div>}
        {cv.loading ? <div className="empty-state no-print">Đang mở {documentLabel}...</div> : cv.data ? <>
          <div className={`paper-workspace ${mode === 'pdf' ? 'behind-preview' : ''}`} inert={busy || mode === 'pdf' ? '' : undefined}>
            <CVEditor key={cv.filename} data={cv.data} layout={cv.layout} edit={edit} sheetRef={sheet} overflow={overflow} zoom={zoom === 'fit' ? fitZoom : zoom} />
          </div>
          {mode === 'pdf' && pdf && <div className="pdf-workspace no-print"><PDFPreview pdf={pdf} onError={cv.fail} /></div>}
        </> : <div className="empty-state no-print"><FileText size={40} /><h2>{isLetter ? 'Tạo Cover Letter đầu tiên' : 'Bắt đầu CV của bạn'}</h2><p>{isLetter ? 'Dùng cùng font và căn trang với CV để nộp chung hồ sơ.' : 'Chọn một mẫu, thêm nội dung và tạo hồ sơ của riêng bạn.'}</p><button disabled={!window.desktop || busy} className="primary" onClick={isLetter ? askLetter : () => openTemplates()}>{isLetter ? 'Tạo Cover Letter' : 'Tạo CV mới'}</button>{!isLetter && <button disabled={!window.desktop || busy} onClick={() => run(cv.chooseFolder)}>Chọn thư mục CV</button>}</div>}
      </main>
    </div>}
    {modal && <dialog ref={modalRef} aria-labelledby="dialog-title" className="modal no-print" onCancel={event => { event.preventDefault(); if (!busy) setModal(null); }}>
      <h2 id="dialog-title">{modal === 'export-pages' ? `Xuất ${pdfPages} trang A4?` : modal === 'reload' ? 'Nạp lại bản trên máy?' : `Lưu thành ${documentLabel} mới`}</h2>
      {modal === 'export-pages' ? <><p>PDF có nhiều hơn 1 trang. Bạn có thể tiếp tục {exportAction === 'save' ? 'lưu' : 'in'} toàn bộ {pdfPages} trang, hoặc hủy để chỉnh nội dung gọn hơn.</p>{cv.error && <p className="dialog-error" role="alert">{cv.error}</p>}<div className="modal-actions"><button disabled={busy} onClick={() => setModal(null)}>Hủy</button><button autoFocus className="primary" disabled={busy} onClick={() => run(() => exportAction === 'save' ? savePDF(true) : print(true))}>{exportAction === 'save' ? 'Vẫn lưu PDF' : 'Vẫn in'}</button></div></> : modal !== 'reload' ? <form onSubmit={event => { event.preventDefault(); run(async () => { await cv.duplicate(newName, modal === 'create-letter'); invalidate(); setModal(null); }); }}>
        <label>Tên {documentLabel}<input autoFocus aria-label={`Tên ${documentLabel} mới`} value={newName} onChange={event => setNewName(event.target.value)} maxLength={175} /></label><p>Bản hiện tại vẫn được giữ lại.</p>
        {cv.error && <p className="dialog-error" role="alert">{cv.error}</p>}
        <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Hủy</button><button className="primary" disabled={!newName.trim() || busy}>{modal === 'create-letter' ? 'Tạo Cover Letter' : 'Tạo bản sao'}</button></div>
      </form> : <><p>Bản đang sửa có thay đổi chưa lưu. Bạn có thể tạo bản sao trước để giữ lại.</p><div className="modal-actions"><button onClick={() => setModal(null)}>Hủy</button><button onClick={askDuplicate}>Tạo bản sao</button><button className="primary" onClick={() => run(reload)}>Bỏ sửa và nạp lại</button></div></>}
    </dialog>}
  </div>;
}

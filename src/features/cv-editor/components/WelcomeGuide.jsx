import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, Sparkles, FolderOpen, FileCheck2, X, Copy, Check } from 'lucide-react';
import skill from '../../../../public/cv/SKILL.md?raw';

export default function WelcomeGuide({ directory, onClose }) {
  const dialog = useRef(null);
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const prompt = `/cv\nTạo CV phù hợp với JD và kinh nghiệm thật của tôi theo hướng dẫn dưới đây. Hãy hỏi tôi JD và CV cũ nếu chưa có.\nThư mục lưu CV: ${directory || '[dán thư mục tài liệu từ CV Studio]'}\n\n${skill.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')}`;
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setManualCopy(false); }
    catch { setManualCopy(true); }
  }
  return <dialog ref={dialog} className="modal welcome-guide no-print" aria-labelledby="welcome-title" aria-describedby="welcome-description" onCancel={event => { event.preventDefault(); onClose(); }}>
    <button className="welcome-close" aria-label="Đóng hướng dẫn" onClick={onClose}><X size={20} /></button>
    <span className="eyebrow">CHÀO MỪNG ĐẾN CV STUDIO</span>
    <h1 id="welcome-title">Từ tin tuyển dụng<br />đến CV của bạn.</h1>
    <p id="welcome-description">AI giúp viết nội dung. CV Studio giúp trình bày & xuất PDF.</p>
    <ol className="welcome-flow">
      <li><div className="welcome-art art-jd" aria-hidden="true"><div className="draw-browser"><span className="draw-dots">•••</span><Search size={22} /><i /><i /><b>JD <Check size={16} /></b></div></div><span className="welcome-step">01 · TÌM VIỆC</span><h2>Lấy JD online</h2><p>Copy mô tả công việc<br />từ trang tuyển dụng.</p><ArrowRight className="welcome-arrow" aria-hidden="true" /></li>
      <li><div className="welcome-art art-ai" aria-hidden="true"><div className="draw-chat"><Sparkles size={26} /><b>/cv</b><i /><i /><span>JD + CV cũ</span></div></div><span className="welcome-step">02 · VIẾT VỚI AI</span><h2>Codex / ChatGPT</h2><p>Dán lệnh bên dưới,<br />gửi JD + kinh nghiệm thật.</p><ArrowRight className="welcome-arrow" aria-hidden="true" /></li>
      <li><div className="welcome-art art-folder" aria-hidden="true"><FolderOpen size={100} strokeWidth={1.2} /><span className="draw-file">CV.md</span></div><span className="welcome-step">03 · LƯU FILE</span><h2>Đặt CV vào thư mục</h2><p>Lưu file <b>.md</b> tại đường dẫn dưới.<br />Giữ JD ở thư mục khác.</p><ArrowRight className="welcome-arrow" aria-hidden="true" /></li>
      <li><div className="welcome-art art-pdf" aria-hidden="true"><div className="draw-resume"><FileCheck2 size={30} /><i /><i /><i /><b>PDF ↗</b></div></div><span className="welcome-step">04 · HOÀN THIỆN</span><h2>Mở trong CV Studio</h2><p>Chọn CV → Đổi mẫu<br />Xem bản in → Lưu PDF.</p></li>
    </ol>
    <div className="welcome-tools"><div><span className="welcome-step">THƯ MỤC LƯU CV CỦA BẠN</span><code>{directory || 'Chọn thư mục tài liệu trong app sau khi đóng hướng dẫn.'}</code><small>Đổi nơi lưu: Thao tác tài liệu → Chọn thư mục tài liệu. AI sửa file? Bấm Nạp lại.</small></div><FolderOpen size={28} aria-hidden="true" /></div>
    <div className="welcome-bottom"><div><b>Bắt đầu bằng skill /cv</b><p>Lệnh sao chép đã kèm hướng dẫn cho AI, dùng được cả khi chưa cài skill.</p></div><button onClick={copyPrompt}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Đã sao chép' : 'Sao chép lệnh /cv'}</button><button autoFocus className="primary" onClick={onClose}>Bắt đầu<ArrowRight size={17} /></button></div>
    {manualCopy && <label className="welcome-copy">Không thể sao chép tự động. Chọn và sao chép lệnh này:<textarea readOnly value={prompt} onFocus={event => event.target.select()} /></label>}
  </dialog>;
}

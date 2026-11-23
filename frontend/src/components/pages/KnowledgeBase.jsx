import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { useToast } from '../../contexts/ToastContext';
import './KnowledgeBase.css';


const StatCard = ({ title, value, icon, accent }) => (
  <div className={`kb-stat-card ${accent ? 'kb-stat-card--accent' : ''}`}>
    <div className="kb-stat-card__body">
      <p className="kb-stat-card__label">{title}</p>
      <h3 className="kb-stat-card__value">{value ?? '—'}</h3>
    </div>
    <div className="kb-stat-card__icon">{icon}</div>
  </div>
);

const FileTypeBadge = ({ type }) => {
  const map = {
    PDF:  { bg: '#FEF2F2', color: '#DC2626' },
    DOCX: { bg: '#DBEAFE', color: '#1E40AF' },
    DOC:  { bg: '#DBEAFE', color: '#1E40AF' },
    TXT:  { bg: '#F3F4F6', color: '#374151' },
  };
  const style = map[type] || { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span className="kb-badge kb-badge--type" style={{ background: style.bg, color: style.color }}>
      {type}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const cls = status === 'Processed' ? 'kb-badge--processed' : 'kb-badge--processing';
  return <span className={`kb-badge kb-badge--status ${cls}`}>{status}</span>;
};

const UploadPanel = ({
  isDragOver, onDragOver, onDragLeave, onDrop, onClick,
  selectedFiles, onRemoveFile, documentName, onDocumentNameChange,
  selectedCategory, onCategorySelect, categories,
  onProcess, loading, uploadProgress,
}) => {
  const [showDrop, setShowDrop] = useState(false);

  return (
    <div className="kb-card kb-upload-panel">
      <div className="kb-section-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM8 15.01L9.41 16.42L11 14.84V19H13V14.84L14.59 16.43L16 15.01L12.01 11L8 15.01Z" fill="#4CAF50"/>
        </svg>
        <h2 className="kb-section-title">Document Upload</h2>
      </div>

      {/* Drop zone */}
      <div
        className={`kb-dropzone ${isDragOver ? 'kb-dropzone--active' : ''} ${selectedFiles.length > 0 ? 'kb-dropzone--has-files' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
      >
        {selectedFiles.length === 0 ? (
          <div className="kb-dropzone__empty">
            <div className="kb-dropzone__icon-wrap">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04Z" fill="#C9E7CB"/>
              </svg>
              <div className="kb-dropzone__upload-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16H15V10H19L12 3L5 10H9V16ZM5 18H19V20H5V18Z" fill="white"/>
                </svg>
              </div>
            </div>
            <p className="kb-dropzone__label">Drag &amp; drop files here</p>
            <p className="kb-dropzone__hint">PDF, DOC, TXT — up to 25 MB each</p>
            <span className="kb-dropzone__cta">or click to browse</span>
          </div>
        ) : (
          <div className="kb-file-list" onClick={e => e.stopPropagation()}>
            {selectedFiles.map((file, i) => (
              <div key={i} className="kb-file-item">
                <div className="kb-file-item__icon">
                  <FileTypeBadge type={file.name.split('.').pop().toUpperCase()} />
                </div>
                <div className="kb-file-item__info">
                  <span className="kb-file-item__name">{file.name}</span>
                  <span className="kb-file-item__size">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button className="kb-file-item__remove" onClick={() => onRemoveFile(i)} title="Remove">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#6B7280"/>
                  </svg>
                </button>
              </div>
            ))}
            <p className="kb-dropzone__add-more">Click here or drag to add more files</p>
          </div>
        )}
      </div>

      {/* Upload progress bar */}
      {loading && uploadProgress > 0 && (
        <div className="kb-progress">
          <div className="kb-progress__bar" style={{ width: `${uploadProgress}%` }} />
          <span className="kb-progress__label">{uploadProgress}% uploaded</span>
        </div>
      )}

      {/* Controls */}
      <div className="kb-upload-controls">
        <div className="kb-control-group">
          <label className="kb-control-label">Document Name</label>
          <input
            type="text"
            className="kb-input"
            placeholder="Enter document name…"
            value={documentName}
            onChange={e => onDocumentNameChange(e.target.value)}
          />
        </div>
        <div className="kb-control-group">
          <label className="kb-control-label">Category</label>
          <CategoryDropdown
            selected={selectedCategory}
            options={categories}
            onSelect={onCategorySelect}
          />
        </div>
        <button
          className="kb-btn kb-btn--primary kb-btn--process"
          onClick={onProcess}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="kb-spinner" />
              Processing…
            </>
          ) : 'Process Documents'}
        </button>
      </div>
    </div>
  );
};

const CategoryDropdown = ({ selected, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="kb-dropdown" ref={ref}>
      <button className="kb-dropdown__trigger" onClick={() => setOpen(o => !o)} type="button">
        <span>{selected}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#6B7280"/>
        </svg>
      </button>
      {open && (
        <div className="kb-dropdown__menu">
          {options.map(opt => (
            <button key={opt} className={`kb-dropdown__item ${selected === opt ? 'kb-dropdown__item--active' : ''}`}
              onClick={() => { onSelect(opt); setOpen(false); }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DocumentTable = ({
  documents, loading,
  searchQuery, onSearch,
  filterCategory, onFilterCategory,
  filterStatus, onFilterStatus,
  sortField, sortDir, onSort,
  categories, onView,
  currentPage, totalPages, onPageChange,
  formatFileSize, formatDate, getFileType,
}) => {
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="kb-sort-icon kb-sort-icon--inactive">↕</span>;
    return <span className="kb-sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="kb-card kb-doc-table-card">
      {/* Table header toolbar */}
      <div className="kb-doc-table__toolbar">
        <h2 className="kb-section-title">Recent Documents</h2>
        <div className="kb-doc-table__filters">
          <div className="kb-search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="#9CA3AF"/>
            </svg>
            <input
              type="text"
              placeholder="Search documents…"
              value={searchQuery}
              onChange={e => onSearch(e.target.value)}
              className="kb-search-box__input"
            />
          </div>
          <select className="kb-filter-select" value={filterCategory} onChange={e => onFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="kb-filter-select" value={filterStatus} onChange={e => onFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Processed">Processed</option>
            <option value="Processing">Processing</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="kb-table-wrapper">
        <table className="kb-table">
          <thead>
            <tr>
              <th className="kb-table__th kb-table__th--left" onClick={() => onSort('file_name')}>
                Document <SortIcon field="file_name" />
              </th>
              <th className="kb-table__th">Category</th>
              <th className="kb-table__th" onClick={() => onSort('uploaded_by_name')}>
                Uploaded By <SortIcon field="uploaded_by_name" />
              </th>
              <th className="kb-table__th">Type</th>
              <th className="kb-table__th" onClick={() => onSort('status')}>
                Status <SortIcon field="status" />
              </th>
              <th className="kb-table__th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="kb-table__empty">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM6 20V4H13V9H18V20H6Z" fill="#E1E7EF"/>
                  </svg>
                  <p>No documents found</p>
                </td>
              </tr>
            ) : (
              documents.map(doc => (
                <tr key={doc.id} className="kb-table__row">
                  <td className="kb-table__td kb-table__td--doc">
                    <div className="kb-doc-name">{doc.file_name}</div>
                    <div className="kb-doc-meta">{formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}</div>
                  </td>
                  <td className="kb-table__td kb-table__td--center">
                    <span className="kb-category-tag">{doc.category || '—'}</span>
                  </td>
                  <td className="kb-table__td kb-table__td--center">
                    <span className="kb-uploader">{doc.uploaded_by_name || 'Unknown'}</span>
                  </td>
                  <td className="kb-table__td kb-table__td--center">
                    <FileTypeBadge type={getFileType(doc.file_name)} />
                  </td>
                  <td className="kb-table__td kb-table__td--center">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="kb-table__td kb-table__td--center kb-table__td--actions">
                    <button className="kb-view-btn" onClick={() => onView(doc.id)} title="View document">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
                      </svg>
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="kb-pagination">
          <button className="kb-pagination__btn" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="currentColor"/></svg>
            Prev
          </button>
          <div className="kb-pagination__pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} className={`kb-pagination__page ${currentPage === n ? 'kb-pagination__page--active' : ''}`} onClick={() => onPageChange(n)}>
                {n}
              </button>
            ))}
          </div>
          <button className="kb-pagination__btn" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8.59 16.59L10 18L16 12L10 6L8.59 7.41L13.17 12L8.59 16.59Z" fill="currentColor"/></svg>
          </button>
        </div>
      )}
    </div>
  );
};

const AISummary = ({ stats, indexRatio }) => (
  <div className="kb-card kb-sidebar-card">
    <div className="kb-sidebar-card__header">
      <div className="kb-sidebar-card__icon kb-sidebar-card__icon--ai">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="white"/>
        </svg>
      </div>
      <h3 className="kb-sidebar-card__title">AI Knowledge Summary</h3>
    </div>
    <div className="kb-ai-summary">
      <p className="kb-ai-summary__text">
        Your knowledge base contains <strong>{stats.total ?? 0}</strong> documents with a{' '}
        <strong>{indexRatio}%</strong> indexing rate. <strong>{stats.processing ?? 0}</strong> document{stats.processing !== 1 ? 's are' : ' is'} currently being processed by the AI pipeline.
      </p>
      <div className="kb-ai-summary__metric">
        <span>Index Coverage</span>
        <span className="kb-ai-summary__metric-val">{indexRatio}%</span>
      </div>
      <div className="kb-progress-bar-wrap">
        <div className="kb-progress-bar" style={{ width: `${indexRatio}%` }} />
      </div>
      <div className="kb-ai-summary__chips">
        <span className="kb-chip kb-chip--green">AI Ready</span>
        <span className="kb-chip kb-chip--blue">Vala AI</span>
        <span className="kb-chip kb-chip--gray">Indexed</span>
      </div>
    </div>
  </div>
);

const CategoryProgress = ({ categories }) => (
  <div className="kb-card kb-sidebar-card">
    <div className="kb-sidebar-card__header">
      <div className="kb-sidebar-card__icon kb-sidebar-card__icon--cat">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M20 6H12L10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6ZM20 18H4V8H20V18Z" fill="white"/>
        </svg>
      </div>
      <h3 className="kb-sidebar-card__title">Top Categories</h3>
    </div>
    <div className="kb-cat-list">
      {categories.length === 0 ? (
        <p className="kb-cat-list__empty">No categories yet</p>
      ) : (
        categories.map(({ name, count, pct }) => (
          <div key={name} className="kb-cat-item">
            <div className="kb-cat-item__row">
              <span className="kb-cat-item__name">{name}</span>
              <span className="kb-cat-item__count">{count} doc{count !== 1 ? 's' : ''}</span>
            </div>
            <div className="kb-progress-bar-wrap kb-progress-bar-wrap--sm">
              <div className="kb-progress-bar kb-progress-bar--cat" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const ActivityFeed = ({ documents, formatDate }) => (
  <div className="kb-card kb-sidebar-card">
    <div className="kb-sidebar-card__header">
      <div className="kb-sidebar-card__icon kb-sidebar-card__icon--act">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M13 2.05V4.05C17.39 4.59 20.5 8.58 19.96 12.97C19.5 16.61 16.64 19.5 13 19.93V21.93C18.5 21.38 22.5 16.5 21.95 11C21.5 6.25 17.73 2.5 13 2.05ZM11 2.06C8.04 2.34 5.25 3.92 3.44 6.4L5 7.94C6.35 5.93 8.35 4.53 11 4.06V2.06ZM3.45 17.6C5.25 20.07 8.03 21.65 11 21.93V19.93C8.38 19.47 6.38 18.07 5.03 16.06L3.45 17.6ZM11.08 16.08L16.08 11.08L14.67 9.67L11.08 13.26L9.5 11.68L8.09 13.09L11.08 16.08ZM2.03 12C2.03 13.5 2.33 14.89 2.86 16.16L4.5 14.5C4.18 13.7 4.03 12.87 4.03 12H2.03Z" fill="white"/>
        </svg>
      </div>
      <h3 className="kb-sidebar-card__title">Recent Activity</h3>
    </div>
    <div className="kb-activity-list">
      {documents.slice(0, 5).map(doc => (
        <div key={doc.id} className="kb-activity-item">
          <div className="kb-activity-item__dot" />
          <div className="kb-activity-item__content">
            <p className="kb-activity-item__name">{doc.file_name}</p>
            <p className="kb-activity-item__meta">
              {doc.uploaded_by_name || 'Unknown'} · {formatDate(doc.created_at)}
            </p>
          </div>
          <StatusBadge status={doc.status} />
        </div>
      ))}
      {documents.length === 0 && <p className="kb-activity-list__empty">No recent activity</p>}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const KnowledgeBase = () => {
  const API_BASE = import.meta.env.VITE_API_URL;
  const toast = useToast();

  // Upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Select Category…');
  const [documentName, setDocumentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Data state
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [statsData, setStatsData] = useState({ total: 0, processing: 0, indexed: 0, size: '0 B' });

  // Table state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 5;

  // AI search
  const [aiQuery, setAiQuery] = useState('');
  const [showSources, setShowSources] = useState(true);
  const [messages, setMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef(null);

  const AI_SUGGESTIONS = [
    'What are early signs of maize disease?',
    'Summarize integrated disease management',
    'Best practices for farmer training.',
  ];

  const handleAiSubmit = async (query) => {
    const q = (query ?? aiQuery).trim();
    if (!q || aiLoading) return;
    setAiQuery('');
    const userMsg = { id: Date.now(), type: 'user', text: q };
    setMessages(prev => [...prev, userMsg]);
    setAiLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/search/?query=${encodeURIComponent(q)}`,
        null,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        text: res.data.answer ?? '',
        citations: res.data.citations ?? [],
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        error: err.response?.data?.detail || 'Search failed. Please try again.',
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiLoading]);

  const handleClearChat = () => {
    setMessages([]);
    setAiQuery('');
  };

  const categories = [
    'Diseases', 'Policies', 'Finance', 'Climate',
    'Technology', 'Sustainability', 'Training Materials', 'Research Papers',
  ];

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [docsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/documents/recent`, { headers }),
        axios.get(`${API_BASE}/documents/stats`, { headers }),
      ]);

      setRecentDocuments(docsRes.data);

      const bytes = statsRes.data.total_size_bytes || 0;
      let formattedSize;
      if (bytes < 1024) formattedSize = `${bytes} B`;
      else if (bytes < 1024 ** 2) formattedSize = `${(bytes / 1024).toFixed(2)} KB`;
      else if (bytes < 1024 ** 3) formattedSize = `${(bytes / 1024 ** 2).toFixed(2)} MB`;
      else formattedSize = `${(bytes / 1024 ** 3).toFixed(2)} GB`;

      setStatsData({
        total: statsRes.data.total_documents,
        processing: statsRes.data.processing_documents,
        indexed: statsRes.data.processed_documents,
        size: formattedSize,
      });
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  }, [API_BASE]);

  useEffect(() => { fetchData(); }, [fetchData]);

 const pollStatus = useCallback((docId) => {
  const interval = setInterval(async () => {
    try {
      const res = await axios.get(`${API_BASE}/documents/${docId}/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.status === 'Processed') {
        toast.success(` ${res.data.file_name} indexed successfully!`);
        clearInterval(interval);
        fetchData();
      } else if (res.data.status === 'Failed') {
        toast.error(` Indexing failed for ${res.data.file_name}`);
        clearInterval(interval);
        fetchData();
      }
      // status === 'Indexing' or 'Uploaded' → keep polling
    } catch (err) {
      console.error('Polling error:', err);
      clearInterval(interval);
    }
  }, 3000);
}, [API_BASE, fetchData]);

  const handleDragOver = e => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = e => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = e => {
    e.preventDefault();
    setIsDragOver(false);
    setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };
  const handleFileSelect = e => {
    setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)]);
  };
  const handleRemoveFile = idx => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleProcessDocuments = async () => {
    if (selectedFiles.length === 0) { toast.warning('Please select files to upload.'); return; }
    if (!documentName.trim()) { toast.warning('Please enter a document name.'); return; }
    if (selectedCategory === 'Select Category…') { toast.warning('Please select a category.'); return; }

    setLoading(true);
    setUploadProgress(0);

    const user = JSON.parse(localStorage.getItem('user'));
    const formData = new FormData();
    selectedFiles.forEach(f => formData.append('files', f));
    formData.append('document_name', documentName.trim());
    formData.append('category', selectedCategory);
    if (user?.tenant_id) formData.append('tenant_id', user.tenant_id);

    try {
  const response = await axios.post(`${API_BASE}/documents/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    onUploadProgress: e => {
      setUploadProgress(Math.round((e.loaded / e.total) * 100));
    },
  });

  // File is in GCS — indexing starting in background
  toast.info(' Upload successful — indexing in progress...');
  setSelectedFiles([]);
  setDocumentName('');
  setSelectedCategory('Select Category…');
  setUploadProgress(0);
  fetchData(); // show document with "Uploaded" status immediately

  // Poll each uploaded document until Processed or Failed
  response.data.forEach(doc => pollStatus(doc.id));

} catch (err) {
  console.error('Upload failed:', err.response?.data || err);
  toast.error(`Upload failed: ${err.response?.data?.detail || 'Unknown error'}`);
} finally {
      setLoading(false);
    }
  };

  // ── Table helpers ──────────────────────────────────────────────────────────

  const getFileType = fileName => {
    const ext = fileName?.split('.').pop()?.toUpperCase();
    return ['PDF', 'DOCX', 'DOC', 'TXT'].includes(ext) ? ext : ext || 'FILE';
  };

  const formatFileSize = bytes => {
    if (!bytes) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = str => {
    if (!str) return '';
    const d = new Date(str);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setCurrentPage(1);
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const filteredDocuments = recentDocuments
    .filter(doc => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || doc.file_name?.toLowerCase().includes(q) || doc.uploaded_by_name?.toLowerCase().includes(q);
      const matchCat = !filterCategory || doc.category === filterCategory;
      const matchSt = !filterStatus || doc.status === filterStatus;
      return matchSearch && matchCat && matchSt;
    })
    .sort((a, b) => {
      const va = (a[sortField] ?? '').toString().toLowerCase();
      const vb = (b[sortField] ?? '').toString().toLowerCase();
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const paginatedDocs = filteredDocuments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = page => { setCurrentPage(page); };

  const handleViewDocument = async (docId) => {
    try {
      const res = await axios.get(`${API_BASE}/documents/${docId}/view`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const url = res.data?.url ?? res.data?.s3_url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else toast.warning('No viewable URL found for this document.');
    } catch (err) {
      toast.error(`Could not open document: ${err.response?.data?.detail || 'Unknown error'}`);
    }
  };

  // Top categories derived from all documents
  const topCategories = (() => {
    const counts = {};
    recentDocuments.forEach(d => { if (d.category) counts[d.category] = (counts[d.category] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = entries[0]?.[1] || 1;
    return entries.map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }));
  })();

  const indexRatio = statsData.total > 0 ? Math.round((statsData.indexed / statsData.total) * 100) : 0;

  // ── Stat card config ───────────────────────────────────────────────────────
  const statCards = [
    {
      title: 'Total Documents', value: statsData.total,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 6H12L10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6ZM20 18H4V8H20V18Z" fill="#65758B"/></svg>,
    },
    {
      title: 'Processing', value: statsData.processing,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 2V8H6.01L6 8.01L10 12L6 16L6.01 16.01H6V22H18V16.01H17.99L18 16L14 12L18 8.01L17.99 8H18V2H6ZM16 16.5V20H8V16.5L12 12.5L16 16.5ZM12 11.5L8 7.5V4H16V7.5L12 11.5Z" fill="#F59F0A"/></svg>,
    },
    {
      title: 'Total Indexed', value: statsData.indexed,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12.45 16H14.54L9.42996 3H7.56996L2.45996 16H4.54996L5.66996 13H11.31L12.45 16ZM6.42996 11L8.49996 5.48L10.57 11H6.42996ZM21.59 11.59L13.5 19.68L9.82996 16L8.41996 17.41L13.51 22.5L23 13L21.59 11.59Z" fill="#4CAF50"/></svg>,
      accent: true,
    },
    {
      title: 'Storage Used', value: statsData.size,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M2 20H22V16H2V20ZM4 17H6V19H4V17ZM2 4V8H22V4H2ZM6 7H4V5H6V7ZM2 14H22V10H2V14ZM4 11H6V13H4V11Z" fill="#65758B"/></svg>,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="dashboard-content">
          <div className="kb-root">

            {/* ── Page Header ── */}
            <div className="kb-page-header">
              <div className="kb-page-header__text">
                <h1 className="kb-page-title">Knowledge Base</h1>
                <p className="kb-page-subtitle">AI-powered document management with Vala AI integration</p>
              </div>
              <button className="kb-btn kb-btn--primary kb-btn--upload" onClick={() => fileInputRef.current?.click()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM8 15.01L9.41 16.42L11 14.84V19H13V14.84L14.59 16.43L16 15.01L12.01 11L8 15.01Z" fill="white"/>
                </svg>
                Upload Document
              </button>
            </div>

            {/* ── AI Search + Chat ── */}
            <div className={`kb-ai-search${messages.length > 0 || aiLoading ? ' kb-ai-search--expanded' : ''}`}>

              {/* Chat history — shown inside the card */}
              {(messages.length > 0 || aiLoading) && (
                <div className="kb-ai-chat-history">
                  {messages.map(msg => (
                    msg.type === 'user' ? (
                      <div key={msg.id} className="kb-ai-msg kb-ai-msg--user">
                        <div className="kb-ai-msg__user-bubble">{msg.text}</div>
                      </div>
                    ) : (
                      <div key={msg.id} className="kb-ai-msg kb-ai-msg--ai">
                        <div className="kb-ai-msg__avatar">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="white"/>
                          </svg>
                        </div>
                        <div className="kb-ai-msg__content">
                          {msg.error ? (
                            <p className="kb-ai-msg__error">{msg.error}</p>
                          ) : (
                            <>
                              <p className="kb-ai-msg__text">{msg.text}</p>
                              {showSources && msg.citations?.length > 0 && (
                                <div className="kb-chat-sources">
                                  <span className="kb-chat-sources__label">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                      <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM6 20V4H13V9H18V20H6Z" fill="currentColor"/>
                                    </svg>
                                    {msg.citations.length} source{msg.citations.length !== 1 ? 's' : ''}
                                  </span>
                                  <div className="kb-chat-sources__chips">
                                    {msg.citations.map((c, i) => (
                                      <div key={i} className="kb-chat-source-chip">
                                        <span className="kb-chat-source-chip__index">{i + 1}</span>
                                        <span className="kb-chat-source-chip__name">{c.document}</span>
                                        {/* <span className="kb-chat-source-chip__chunk">&sect;{c.chunk}</span> */}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  ))}

                  {/* Typing indicator */}
                  {aiLoading && (
                    <div className="kb-ai-msg kb-ai-msg--ai">
                      <div className="kb-ai-msg__avatar">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="white"/>
                        </svg>
                      </div>
                      <div className="kb-ai-msg__content kb-ai-msg__content--typing">
                        <div className="kb-chat-typing__dots"><span /><span /><span /></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Divider between chat and input */}
              {(messages.length > 0 || aiLoading) && <div className="kb-ai-chat-divider" />}

              {/* Input row */}
              <div className="kb-ai-search__input-row">
                <button className="kb-ai-search__icon-btn" aria-label="AI Assistant" tabIndex={-1}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="white"/>
                  </svg>
                </button>
                <input
                  type="text"
                  className="kb-ai-search__input"
                  placeholder={messages.length > 0 ? 'Ask a follow-up question…' : 'Ask anything from your knowledge base…'}
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAiSubmit()}
                />
                <button
                  className="kb-ai-search__send-btn"
                  onClick={() => handleAiSubmit()}
                  disabled={!aiQuery.trim() || aiLoading}
                  aria-label="Send query"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="white"/>
                  </svg>
                </button>
              </div>

              {/* Footer */}
              <div className="kb-ai-search__footer">
                {messages.length === 0 && (
                  <div className="kb-ai-suggestions">
                    <span className="kb-ai-suggestions__label">Try asking:</span>
                    <div className="kb-ai-suggestions__chips">
                      {AI_SUGGESTIONS.map(s => (
                        <button
                          key={s}
                          className="kb-ai-suggestions__chip"
                          onClick={() => handleAiSubmit(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="kb-ai-footer-controls">
                  <button
                    className={`kb-ai-sources-toggle${showSources ? ' kb-ai-sources-toggle--active' : ''}`}
                    onClick={() => setShowSources(v => !v)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM6 20V4H13V9H18V20H6Z" fill="currentColor"/>
                    </svg>
                    {showSources ? 'Hide Sources' : 'Show Sources'}
                  </button>
                  {messages.length > 0 && (
                    <button className="kb-ai-clear-btn" onClick={handleClearChat}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                      </svg>
                      Clear chat
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="kb-stats-grid">
              {statCards.map(s => <StatCard key={s.title} {...s} />)}
            </div>

            {/* ── Body: main column + sidebar ── */}
            <div className="kb-body">
              <div className="kb-main-col">
                {/* Upload panel */}
                <UploadPanel
                  isDragOver={isDragOver}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  selectedFiles={selectedFiles}
                  onRemoveFile={handleRemoveFile}
                  documentName={documentName}
                  onDocumentNameChange={setDocumentName}
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                  categories={categories}
                  onProcess={handleProcessDocuments}
                  loading={loading}
                  uploadProgress={uploadProgress}
                />

                {/* Document table */}
                <DocumentTable
                  documents={paginatedDocs}
                  searchQuery={searchQuery}
                  onSearch={q => { setSearchQuery(q); setCurrentPage(1); }}
                  filterCategory={filterCategory}
                  onFilterCategory={v => { setFilterCategory(v); setCurrentPage(1); }}
                  filterStatus={filterStatus}
                  onFilterStatus={v => { setFilterStatus(v); setCurrentPage(1); }}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  categories={categories}
                  onView={handleViewDocument}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  formatFileSize={formatFileSize}
                  formatDate={formatDate}
                  getFileType={getFileType}
                />
              </div>

              {/* ── Right Sidebar ── */}
              <aside className="kb-sidebar-col">
                <AISummary stats={statsData} indexRatio={indexRatio} />
                <CategoryProgress categories={topCategories} />
                <ActivityFeed documents={recentDocuments} formatDate={formatDate} />
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default KnowledgeBase;
